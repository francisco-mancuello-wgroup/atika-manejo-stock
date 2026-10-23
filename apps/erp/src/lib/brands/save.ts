import { randomUUID } from "node:crypto";
import type { Brand } from "@atika/db";
import { brandKey } from "@atika/db/brands";
import type { FormState } from "../action-state";
import { activeGroupWhere } from "../catalog-groups/stock";
import type { TransactionRunner } from "../lots/save";
import { type PhotoUpload, prepareUpload } from "../products/photos";
import { type CoverStorage, isUploadedCover } from "./cover-storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: FormState = { status: "error", message: "No se encontró la marca." };
/** The cover shows at most about 34 rem wide: 1200 px keeps it sharp on phones and desktops. */
const COVER_MAX_SIDE = 1200;

/** A brand with the numbers the Marcas table shows. */
export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFallback: boolean;
  position: number;
  coverUrl: string | null;
  /** Products saved with this brand (Otras marcas: no brand or one nobody registered). */
  productCount: number;
  /** Of those, the ones the web can show now: published with stock, or held by an active group. */
  visibleCount: number;
}

type ReadDb = Pick<TransactionRunnerClient, "brand" | "product">;
type TransactionRunnerClient = Parameters<Parameters<TransactionRunner["$transaction"]>[0]>[0];

/** Every brand in display order with its product counts; Otras marcas is last. */
export async function listBrands(db: ReadDb, now: Date = new Date()): Promise<BrandRow[]> {
  const [brands, products] = await Promise.all([
    db.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.product.findMany({
      select: {
        brand: true,
        isPublished: true,
        variants: {
          select: {
            stock: true,
            allocations: {
              where: { group: activeGroupWhere(now) },
              select: { allocated: true, sold: true },
            },
          },
        },
      },
    }),
  ]);
  const byKey = new Map(brands.filter((b) => !b.isFallback).map((brand) => [brand.key, brand.id]));
  const fallback = brands.find((brand) => brand.isFallback);
  const counts = new Map<string, { total: number; visible: number }>();
  for (const product of products) {
    const id = byKey.get(brandKey(product.brand)) ?? fallback?.id;
    if (!id) continue;
    const count = counts.get(id) ?? { total: 0, visible: 0 };
    const published = product.isPublished && product.variants.some((v) => v.stock > 0);
    const inGroup = product.variants.some((variant) =>
      variant.allocations.some((a) => a.allocated - a.sold > 0),
    );
    counts.set(id, {
      total: count.total + 1,
      visible: count.visible + (published || inGroup ? 1 : 0),
    });
  }
  return brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    isActive: brand.isActive,
    isFallback: brand.isFallback,
    position: brand.position,
    coverUrl: brand.coverUrl,
    productCount: counts.get(brand.id)?.total ?? 0,
    visibleCount: counts.get(brand.id)?.visible ?? 0,
  }));
}

/** Registered brand names, for the product form's suggestions (Otras marcas is not a name to type). */
export async function listBrandNames(db: Pick<ReadDb, "brand">): Promise<string[]> {
  const rows = await db.brand.findMany({
    where: { isFallback: false },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((row) => row.name);
}

/** Turns a brand on or off for the whole web. */
export async function setBrandActive(
  db: TransactionRunner,
  brandId: string,
  isActive: boolean,
): Promise<FormState> {
  if (!UUID.test(brandId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.brand.updateMany({ where: { id: brandId }, data: { isActive } }),
  );
  if (result.count === 0) return NOT_FOUND;
  return { status: "success", message: isActive ? "Marca activada." : "Marca desactivada." };
}

/**
 * Moves a brand one place up or down among the registered ones. Positions are rewritten as
 * 0..n-1, with Otras marcas always last; Otras marcas itself cannot move.
 */
export async function moveBrand(
  db: TransactionRunner,
  brandId: string,
  direction: "up" | "down",
): Promise<FormState> {
  if (!UUID.test(brandId)) return NOT_FOUND;
  return db.$transaction(async (tx): Promise<FormState> => {
    const all = await tx.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
    const target = all.find((brand) => brand.id === brandId);
    if (!target) return NOT_FOUND;
    if (target.isFallback) {
      return { status: "error", message: "Otras marcas siempre va al final." };
    }
    const order = all.filter((brand) => !brand.isFallback);
    const from = order.findIndex((brand) => brand.id === brandId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to >= 0 && to < order.length) {
      const [moved] = order.splice(from, 1);
      if (moved) order.splice(to, 0, moved);
    }
    const final = [...order, ...all.filter((brand) => brand.isFallback)];
    for (const [position, brand] of final.entries()) {
      if (brand.position !== position) {
        await tx.brand.update({ where: { id: brand.id }, data: { position } });
      }
    }
    return { status: "success", message: "Orden guardado." };
  });
}

const cleanup = (storage: CoverStorage | undefined, urls: readonly (string | null)[]) =>
  Promise.allSettled(
    urls
      .filter((url): url is string => url !== null && isUploadedCover(url))
      .map((url) => storage?.deleteBrandCover(url)),
  );

/** Replaces the brand's cover with the uploaded image (shrunk and converted to WebP). */
export async function saveBrandCover(
  db: TransactionRunner,
  brandId: string,
  upload: PhotoUpload,
  storage: CoverStorage,
): Promise<FormState> {
  if (!UUID.test(brandId)) return NOT_FOUND;
  const prepared = await prepareUpload(upload, COVER_MAX_SIDE);
  if (!prepared.ok) return { status: "error", message: prepared.error };

  const url = await storage.saveBrandCover(brandId, `${randomUUID()}.webp`, prepared.bytes);
  let previous: Pick<Brand, "coverUrl"> | null;
  try {
    previous = await db.$transaction(async (tx) => {
      const current = await tx.brand.findUnique({
        where: { id: brandId },
        select: { coverUrl: true },
      });
      if (current) await tx.brand.update({ where: { id: brandId }, data: { coverUrl: url } });
      return current;
    });
  } catch (error) {
    await cleanup(storage, [url]);
    throw error;
  }
  if (!previous) {
    await cleanup(storage, [url]);
    return NOT_FOUND;
  }
  await cleanup(storage, [previous.coverUrl]);
  return { status: "success", message: "Portada guardada." };
}

/** Removes the uploaded cover: the web goes back to the default one for the brand. */
export async function removeBrandCover(
  db: TransactionRunner,
  brandId: string,
  storage: CoverStorage,
): Promise<FormState> {
  if (!UUID.test(brandId)) return NOT_FOUND;
  const previous = await db.$transaction(async (tx) => {
    const current = await tx.brand.findUnique({
      where: { id: brandId },
      select: { coverUrl: true },
    });
    if (current) await tx.brand.update({ where: { id: brandId }, data: { coverUrl: null } });
    return current;
  });
  if (!previous) return NOT_FOUND;
  await cleanup(storage, [previous.coverUrl]);
  return { status: "success", message: "Portada quitada." };
}
