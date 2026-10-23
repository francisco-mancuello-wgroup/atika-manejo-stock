import "server-only";
import type { Prisma } from "@atika/db";
import { brandProductWhere, listBrandFilters } from "../brands/filter";
import type { CatalogFilters } from "../catalog/filters";
import { coverUrl } from "../cover";
import { getDb } from "../db";
import { sortSizes } from "../sizes";
import { getProductGroupNames } from "./catalog-groups";

export interface CatalogProduct {
  id: string;
  name: string;
  lotName: string;
  priceGs: number;
  category: string | null;
  isPublished: boolean;
  /** Sizes with at least one unit in stock. */
  sizes: string[];
  /** Cover photo URL, or null. */
  imageUrl: string | null;
  /** Name of the active publication group the product sits in, or null. */
  groupName: string | null;
}

export interface CatalogSettingsView {
  whatsappNumber: string;
  messageTemplate: string;
  heroText: string;
  showPrices: boolean;
  showSoldOutSizes: boolean;
  hideOutOfStock: boolean;
}

async function whereFor(
  filters: CatalogFilters,
  db: Pick<Prisma.TransactionClient, "brand">,
): Promise<Prisma.ProductWhereInput> {
  const query = filters.query?.trim();
  const status: Prisma.ProductWhereInput =
    filters.status === "visibles"
      ? { isPublished: true }
      : filters.status === "ocultos"
        ? { isPublished: false }
        : filters.status === "sin-stock"
          ? { variants: { none: { stock: { gt: 0 } } } }
          : {};
  // An unknown slug (an old bookmark) filters nothing
  const brand: Prisma.ProductWhereInput = filters.brand
    ? ((await brandProductWhere(db, filters.brand)) ?? {})
    : {};
  return {
    ...status,
    // AND keeps the brand's own OR apart from the text search below
    AND: [brand],
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { color: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function getCatalogProducts(
  filters: CatalogFilters,
  db: Pick<Prisma.TransactionClient, "product" | "groupAllocation" | "brand"> = getDb(),
  now: Date = new Date(),
): Promise<CatalogProduct[]> {
  const products = await db.product.findMany({
    where: await whereFor(filters, db),
    orderBy: { name: "asc" },
    include: {
      lot: { select: { name: true } },
      variants: true,
      images: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });
  const groupNames = await getProductGroupNames(
    db,
    products.map((product) => product.id),
    now,
  );
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    lotName: product.lot.name,
    priceGs: product.priceGs,
    category: product.category,
    isPublished: product.isPublished,
    sizes: sortSizes(product.variants.filter((v) => v.stock > 0).map((v) => v.size)),
    imageUrl: coverUrl(product.images),
    groupName: groupNames.get(product.id) ?? null,
  }));
}

/** The Prendas brand filter: every brand in display order with its product count. */
export async function getCatalogBrandFilters(
  db: Pick<Prisma.TransactionClient, "brand" | "product"> = getDb(),
) {
  return listBrandFilters(db);
}

const DEFAULT_SETTINGS: CatalogSettingsView = {
  whatsappNumber: "",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?",
  heroText: "Prendas seleccionadas, piezas únicas.",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};

export async function getCatalogSettings(): Promise<CatalogSettingsView> {
  const row = await getDb().catalogSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    whatsappNumber: row.whatsappNumber,
    messageTemplate: row.messageTemplate,
    heroText: row.heroText,
    showPrices: row.showPrices,
    showSoldOutSizes: row.showSoldOutSizes,
    hideOutOfStock: row.hideOutOfStock,
  };
}
