import "server-only";
import type { Prisma } from "@atika/db";
import type { CatalogFilters } from "../catalog/filters";
import { getDb } from "../db";
import { sortSizes } from "../sizes";

export interface CatalogProduct {
  id: string;
  name: string;
  lotName: string;
  priceGs: number;
  category: string | null;
  isPublished: boolean;
  /** Sizes with at least one unit in stock. */
  sizes: string[];
}

export interface CatalogSettingsView {
  whatsappNumber: string;
  messageTemplate: string;
  heroText: string;
  showPrices: boolean;
  showSoldOutSizes: boolean;
  hideOutOfStock: boolean;
}

function whereFor(filters: CatalogFilters): Prisma.ProductWhereInput {
  const query = filters.query?.trim();
  const status: Prisma.ProductWhereInput =
    filters.status === "visibles"
      ? { isPublished: true }
      : filters.status === "ocultos"
        ? { isPublished: false }
        : filters.status === "sin-stock"
          ? { variants: { none: { stock: { gt: 0 } } } }
          : {};
  return {
    ...status,
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

export async function getCatalogProducts(filters: CatalogFilters): Promise<CatalogProduct[]> {
  const products = await getDb().product.findMany({
    where: whereFor(filters),
    orderBy: [{ name: "asc" }],
    include: { lot: { select: { name: true } }, variants: true },
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    lotName: product.lot.name,
    priceGs: product.priceGs,
    category: product.category,
    isPublished: product.isPublished,
    sizes: sortSizes(product.variants.filter((v) => v.stock > 0).map((v) => v.size)),
  }));
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
