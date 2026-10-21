import "server-only";
import type { Prisma, PrismaClient } from "@atika/db";
import { type CatalogProduct, type CatalogSettingsView, toCatalogProduct } from "./catalog-view";

/** The slice of the Prisma client the catalog reads (a rolled back transaction works too). */
export type CatalogDb = Pick<PrismaClient, "product" | "catalogSettings">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only these columns are ever selected: nothing sensitive is even read from the database. */
const productSelect = {
  id: true,
  name: true,
  brand: true,
  lot: { select: { supplier: { select: { name: true } } } },
  category: true,
  priceGs: true,
  variants: { select: { size: true, stock: true } },
  images: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

/** The settings that decide which products and sizes are shown. */
export type VisibilitySettings = Pick<
  CatalogSettingsView,
  "showPrices" | "showSoldOutSizes" | "hideOutOfStock"
>;

export const DEFAULT_CATALOG_SETTINGS: CatalogSettingsView = {
  whatsappNumber: "",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?",
  heroText: "Prendas seleccionadas, piezas únicas.",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};

export async function getCatalogSettings(db: CatalogDb): Promise<CatalogSettingsView> {
  const row = await db.catalogSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_CATALOG_SETTINGS;
  return {
    whatsappNumber: row.whatsappNumber,
    messageTemplate: row.messageTemplate,
    heroText: row.heroText,
    showPrices: row.showPrices,
    showSoldOutSizes: row.showSoldOutSizes,
    hideOutOfStock: row.hideOutOfStock,
  };
}

function visibleWhere(settings: VisibilitySettings): Prisma.ProductWhereInput {
  return {
    isPublished: true,
    ...(settings.hideOutOfStock ? { variants: { some: { stock: { gt: 0 } } } } : {}),
  };
}

/** Published products, newest first. `category` null lists all of them ("novedades"). */
export async function listProducts(
  db: CatalogDb,
  settings: VisibilitySettings,
  category: string | null,
): Promise<CatalogProduct[]> {
  const rows = await db.product.findMany({
    where: { ...visibleWhere(settings), ...(category ? { category } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: productSelect,
  });
  return rows.map((row) => toCatalogProduct(row, settings));
}

/** One published product, or null (unknown id, unpublished, or hidden for lack of stock). */
export async function getProduct(
  db: CatalogDb,
  settings: VisibilitySettings,
  id: string,
): Promise<CatalogProduct | null> {
  if (!UUID.test(id)) return null;
  const row = await db.product.findFirst({
    where: { id, ...visibleWhere(settings) },
    select: productSelect,
  });
  return row ? toCatalogProduct(row, settings) : null;
}
