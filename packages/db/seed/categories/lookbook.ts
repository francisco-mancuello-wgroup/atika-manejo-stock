import { readFile } from "node:fs/promises";
import type { ParsedLot } from "../excel/parse";
import { list, record, str } from "../images/manifest";
import { MEDIA_URL_PREFIX } from "../images/paths";
import type { ImagePlan, ProductImageInput } from "../images/seed-images";
import type { Lookbook } from "./choices";

export const CATALOGS = ["casa_icona", "milonga", "sordo"] as const;
export type CatalogSlug = (typeof CATALOGS)[number];

/**
 * Where one workbook product sits in the lookbook (the three brand PDFs). `cover` is the PDF page
 * photo, relative to `data/product-images-new`, for products the PDF export could not match by
 * caption; null when the product already has its brand PDF photo.
 */
export interface LookbookPlacement {
  lot: string;
  code: string | null;
  /** Workbook name, used to find the product (never written to `Product.name`). */
  name: string;
  catalog: CatalogSlug;
  order: number;
  section: string;
  catalogName: string;
  cover: string | null;
}

export interface LookbookData {
  version: 1;
  placements: LookbookPlacement[];
}

const SAFE_COVER = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)+\.webp$/;

function nullableStr(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid lookbook: ${key} must be a string or null`);
  }
  return value;
}

function parsePlacement(value: unknown): LookbookPlacement {
  const raw = record(value, "placement");
  const catalog = str(raw, "catalog");
  if (!(CATALOGS as readonly string[]).includes(catalog)) {
    throw new Error(`Invalid lookbook: unknown catalog "${catalog}"`);
  }
  const order = raw.order;
  if (typeof order !== "number" || !Number.isInteger(order) || order < 1) {
    throw new Error("Invalid lookbook: order must be a positive integer");
  }
  const cover = nullableStr(raw, "cover");
  if (cover !== null && !SAFE_COVER.test(cover)) {
    throw new Error(`Invalid lookbook: unsafe cover "${cover}"`);
  }
  return {
    lot: str(raw, "lot"),
    code: nullableStr(raw, "code"),
    name: str(raw, "name"),
    catalog: catalog as CatalogSlug,
    order,
    section: str(raw, "section"),
    catalogName: str(raw, "catalogName"),
    cover,
  };
}

export function parseLookbook(json: unknown): LookbookData {
  const raw = record(json, "lookbook");
  if (raw.version !== 1) throw new Error("Invalid lookbook: unsupported version");
  return { version: 1, placements: list(raw.placements, "placements").map(parsePlacement) };
}

/** The committed lookbook data, or null when the file does not exist. */
export async function readLookbook(file: string): Promise<LookbookData | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return parseLookbook(JSON.parse(text));
}

export interface PlacedProduct {
  lookbook: Lookbook;
  cover: string | null;
}

export interface LookbookPlan {
  get(lotName: string, productIndex: number): PlacedProduct | null;
  /** Every product with a placement, for the image plan. */
  entries(): { lot: string; index: number; placed: PlacedProduct }[];
  unmatched: { placement: LookbookPlacement; reason: string }[];
  counts: Record<CatalogSlug, number>;
}

export const EMPTY_LOOKBOOK_PLAN: LookbookPlan = {
  get: () => null,
  entries: () => [],
  unmatched: [],
  counts: { casa_icona: 0, milonga: 0, sordo: 0 },
};

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Indexes of the lot's products this placement names: code first, then exact, then normalized name. */
function candidates(lot: ParsedLot, placement: LookbookPlacement): number[] {
  const indexes = [...lot.products.keys()];
  if (placement.code !== null) {
    const byCode = indexes.filter((i) => lot.products[i]?.code === placement.code);
    if (byCode.length > 0) return byCode;
  }
  const exact = indexes.filter((i) => lot.products[i]?.name === placement.name);
  if (exact.length > 0) return exact;
  const wanted = normalize(placement.name);
  return indexes.filter((i) => normalize(lot.products[i]?.name ?? "") === wanted);
}

/** Resolves each placement to exactly one parsed product; anything else is reported, never guessed. */
export function planLookbook(lots: readonly ParsedLot[], data: LookbookData): LookbookPlan {
  const placed = new Map<string, { lot: string; index: number; placed: PlacedProduct }>();
  const key = (lotName: string, index: number) => `${lotName}\u0000${index}`;
  const unmatched: LookbookPlan["unmatched"] = [];
  const counts: Record<CatalogSlug, number> = { casa_icona: 0, milonga: 0, sordo: 0 };

  for (const placement of data.placements) {
    const lot = lots.find((l) => l.lotName === placement.lot);
    if (!lot) {
      unmatched.push({ placement, reason: `lot "${placement.lot}" is not in the workbooks` });
      continue;
    }
    const found = candidates(lot, placement);
    const index = found[0];
    if (found.length !== 1 || index === undefined) {
      unmatched.push({
        placement,
        reason: found.length === 0 ? "no product matches" : `matches ${found.length} products`,
      });
      continue;
    }
    if (placed.has(key(lot.lotName, index))) {
      unmatched.push({ placement, reason: "product already placed by another row" });
      continue;
    }
    placed.set(key(lot.lotName, index), {
      lot: lot.lotName,
      index,
      placed: {
        lookbook: {
          catalog: placement.catalog,
          catalogOrder: placement.order,
          catalogSection: placement.section,
          catalogName: placement.catalogName,
        },
        cover: placement.cover,
      },
    });
    counts[placement.catalog] += 1;
  }

  return {
    get: (lotName, index) => placed.get(key(lotName, index))?.placed ?? null,
    entries: () => [...placed.values()],
    unmatched,
    counts,
  };
}

/**
 * The PDF page photo as the only image of every placed product with a cover (the brand PDF rule:
 * PDF photos are never mixed with the workbook thumbnails). `mediaSubdir` serves the PDF folder.
 */
export function lookbookImages(plan: LookbookPlan, mediaSubdir: string): ImagePlan {
  const images = new Map<string, ProductImageInput[]>();
  for (const { lot, index, placed } of plan.entries()) {
    if (!placed.cover) continue;
    images.set(`${lot}\u0000${index}`, [
      {
        url: `${MEDIA_URL_PREFIX}/${mediaSubdir}/${placed.cover}`,
        alt: placed.lookbook.catalogName ?? "",
        position: 0,
      },
    ]);
  }
  return { get: (lotName, index) => images.get(`${lotName}\u0000${index}`) ?? [] };
}

export function formatLookbookReport(plan: LookbookPlan): string {
  const lines = ["Lookbook placements from data:"];
  for (const catalog of CATALOGS) lines.push(`  ${catalog}: ${plan.counts[catalog]}`);
  if (plan.unmatched.length > 0) {
    lines.push("Lookbook rows without a product:");
    for (const { placement: p, reason } of plan.unmatched) {
      lines.push(`  ${p.lot} / ${p.name}${p.code ? ` [${p.code}]` : ""}: ${reason}`);
    }
  }
  return lines.join("\n");
}
