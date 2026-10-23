import { randomUUID } from "node:crypto";
import type { Prisma } from "@atika/db";
import { ensureBrand } from "@atika/db/brands";
import type { FormState } from "../action-state";
import { formatGs } from "../format";
import { recalculateLot } from "../lots/recalculate";
import type { TransactionRunner } from "../lots/save";
import { type FocalPoint, parseFitFields, parseFocusFields } from "./focus";
import { isUploadedPhoto, type PhotoStorage } from "./photo-storage";
import { arrangePhotos, type PhotoUpload, prepareUpload } from "./photos";
import {
  type NewProductInput,
  type ProductInput,
  parseNewProductForm,
  parseProductForm,
} from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = "No se encontró el producto.";
const SOLD_SIZE = "No se puede quitar un talle con ventas";

type ErrorState = Extract<FormState, { status: "error" }>;

export type ProductSaveResult =
  | ErrorState
  | { status: "success"; message: string; productId: string };

export interface SaveOptions {
  /** Photos chosen in the form (already filtered of empty file inputs). */
  uploads?: PhotoUpload[];
  /** ProductImage ids unticked in the form. */
  removePhotoIds?: string[];
  /** Required whenever there are uploads or removals. */
  storage?: PhotoStorage;
}

function invalid(fieldErrors: Record<string, string>, raw: Record<string, string>): ErrorState {
  return { status: "error", message: "Revisá los campos marcados.", fieldErrors, values: raw };
}

function fail(message: string, raw: Record<string, string>): ErrorState {
  return { status: "error", message, values: raw };
}

type Prepared = { ok: true; photos: Uint8Array[] } | { ok: false; error: string };

async function prepareAll(uploads: readonly PhotoUpload[]): Promise<Prepared> {
  const photos: Uint8Array[] = [];
  for (const upload of uploads) {
    const prepared = await prepareUpload(upload);
    if (!prepared.ok) return { ok: false, error: prepared.error };
    photos.push(prepared.bytes);
  }
  return { ok: true, photos };
}

function needStorage(options: SaveOptions): PhotoStorage {
  if (!options.storage) throw new Error("A PhotoStorage is required to save or remove photos");
  return options.storage;
}

/**
 * Registers a typed brand (so it reaches the web) and returns its stored spelling: "milonga" is
 * saved as "Milonga". No brand stays null, which the web shows under Otras marcas.
 */
async function brandName(
  tx: Prisma.TransactionClient,
  typed: string | null,
): Promise<string | null> {
  return typed ? (await ensureBrand(tx, typed)).name : null;
}

/** Product columns shared by create and update (no lot, no publication state). */
function productData(input: ProductInput, brand: string | null) {
  return {
    code: input.code,
    name: input.name,
    brand,
    color: input.color,
    category: input.category,
    description: input.description,
    originalValueUsd: input.originalValueUsd,
  };
}

/** Applies photo removals and uploads, then reindexes positions with the cover first. */
async function applyPhotos(
  tx: Prisma.TransactionClient,
  productId: string,
  urls: readonly string[],
  options: SaveOptions,
  cover: string | null,
  focus: Record<string, FocalPoint> = {},
  fit: Record<string, number | null> = {},
): Promise<string[]> {
  const remove = options.removePhotoIds ?? [];
  const existing = await tx.productImage.findMany({
    where: { productId },
    orderBy: { position: "asc" },
    select: { id: true, url: true },
  });
  const removing = existing.filter((image) => remove.includes(image.id));
  if (removing.length > 0) {
    await tx.productImage.deleteMany({ where: { id: { in: removing.map((image) => image.id) } } });
  }
  // Only this product's photos that stay: the ids come from the form, so never trust them
  for (const image of existing) {
    if (remove.includes(image.id)) continue;
    const point = focus[image.id];
    const zoom = fit[image.id];
    if (point || zoom !== undefined) {
      await tx.productImage.update({
        where: { id: image.id },
        data: { ...point, ...(zoom !== undefined && { fit: zoom }) },
      });
    }
  }
  const created: Record<string, string> = {};
  for (const [index, url] of urls.entries()) {
    const row = await tx.productImage.create({
      data: { productId, url, position: 1000 + index },
      select: { id: true },
    });
    created[`new:${index}`] = row.id;
  }
  const order = arrangePhotos({
    existing: existing.map((image) => image.id),
    remove,
    uploads: urls.length,
    cover,
  });
  for (const [position, key] of order.entries()) {
    await tx.productImage.update({
      where: { id: created[key] ?? key },
      data: { position },
    });
  }
  return removing.map((image) => image.url).filter(isUploadedPhoto);
}

async function repriceLot(tx: Prisma.TransactionClient, lotId: string) {
  const lot = await tx.lot.findUniqueOrThrow({ where: { id: lotId } });
  await recalculateLot(tx, lotId, {
    exchangeRate: lot.exchangeRate.toNumber(),
    saleFactor: lot.saleFactor.toNumber(),
    vatRate: lot.vatRate.toNumber(),
    costRate: lot.costRate.toNumber(),
    totalShippingUsd: lot.totalShippingUsd.toNumber(),
  });
}

async function storeAll(
  storage: PhotoStorage,
  productId: string,
  photos: readonly Uint8Array[],
): Promise<string[]> {
  const urls: string[] = [];
  try {
    for (const bytes of photos) {
      urls.push(await storage.saveProductPhoto(productId, `${randomUUID()}.webp`, bytes));
    }
  } catch (error) {
    await Promise.allSettled(urls.map((url) => storage.deleteProductPhoto(url)));
    throw error;
  }
  return urls;
}

const cleanup = (storage: PhotoStorage | undefined, urls: readonly string[]) =>
  Promise.allSettled(urls.map((url) => storage?.deleteProductPhoto(url)));

function successMessage(priceGs: number): string {
  return `Guardado. Nuevo precio: ${formatGs(priceGs)}.`;
}

/**
 * Saves one product in a single transaction: fields, sizes (upsert by size; a size with sales
 * cannot be removed) and photos, then reprices every product of the lot with the lot formula.
 */
export async function updateProduct(
  db: TransactionRunner,
  productId: string,
  raw: Record<string, string>,
  options: SaveOptions = {},
): Promise<ProductSaveResult> {
  if (!UUID.test(productId)) return fail(NOT_FOUND, raw);
  const parsed = parseProductForm(raw);
  if (!parsed.success) return invalid(parsed.fieldErrors, raw);
  const input = parsed.data;

  const prepared = await prepareAll(options.uploads ?? []);
  if (!prepared.ok) return invalid({ photos: prepared.error }, raw);

  const uploadedUrls =
    prepared.photos.length > 0
      ? await storeAll(needStorage(options), productId, prepared.photos)
      : [];

  let outcome: { priceGs: number; deleted: string[] } | ErrorState;
  try {
    outcome = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { lotId: true, variants: true },
      });
      if (!product) return fail(NOT_FOUND, raw);

      const keep = new Set(input.sizes.map((row) => row.size));
      const removed = product.variants.filter((variant) => !keep.has(variant.size));
      if (removed.length > 0) {
        const sold = await tx.sale.count({
          where: { variantId: { in: removed.map((variant) => variant.id) } },
        });
        if (sold > 0) return invalid({ sizes: SOLD_SIZE }, raw);
      }

      await tx.product.update({
        where: { id: productId },
        data: productData(input, await brandName(tx, input.brand)),
      });
      if (removed.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
      }
      for (const row of input.sizes) {
        await tx.productVariant.upsert({
          where: { productId_size: { productId, size: row.size } },
          create: { productId, ...row },
          update: { unitsBought: row.unitsBought, stock: row.stock },
        });
      }
      const deleted = await applyPhotos(
        tx,
        productId,
        uploadedUrls,
        options,
        raw.cover ?? null,
        parseFocusFields(raw),
        parseFitFields(raw),
      );
      await repriceLot(tx, product.lotId);
      const { priceGs } = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { priceGs: true },
      });
      return { priceGs, deleted };
    });
  } catch (error) {
    await cleanup(options.storage, uploadedUrls);
    throw error;
  }

  if (!("priceGs" in outcome)) {
    await cleanup(options.storage, uploadedUrls);
    return outcome;
  }
  await cleanup(options.storage, outcome.deleted);
  return { status: "success", message: successMessage(outcome.priceGs), productId };
}

/** Creates a hidden product (with its sizes and photos) in a lot, then reprices the lot. */
export async function createProduct(
  db: TransactionRunner,
  raw: Record<string, string>,
  options: SaveOptions = {},
): Promise<ProductSaveResult> {
  const parsed = parseNewProductForm(raw);
  if (!parsed.success) return invalid(parsed.fieldErrors, raw);
  const input: NewProductInput = parsed.data;

  const prepared = await prepareAll(options.uploads ?? []);
  if (!prepared.ok) return invalid({ photos: prepared.error }, raw);

  const productId = randomUUID();
  const uploadedUrls =
    prepared.photos.length > 0
      ? await storeAll(needStorage(options), productId, prepared.photos)
      : [];

  let outcome: { priceGs: number } | ErrorState;
  try {
    outcome = await db.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: input.lotId }, select: { id: true } });
      if (!lot) return invalid({ lotId: "Elegí una marca." }, raw);
      await tx.product.create({
        data: {
          id: productId,
          lotId: input.lotId,
          ...productData(input, await brandName(tx, input.brand)),
          priceGs: 0,
          isPublished: input.isPublished,
          variants: { create: input.sizes },
        },
      });
      await applyPhotos(tx, productId, uploadedUrls, {}, raw.cover ?? null);
      await repriceLot(tx, input.lotId);
      const { priceGs } = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { priceGs: true },
      });
      return { priceGs };
    });
  } catch (error) {
    await cleanup(options.storage, uploadedUrls);
    throw error;
  }

  if (!("priceGs" in outcome)) {
    await cleanup(options.storage, uploadedUrls);
    return outcome;
  }
  return { status: "success", message: successMessage(outcome.priceGs), productId };
}
