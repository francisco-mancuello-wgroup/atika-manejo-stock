import "server-only";
import type { LotPricingParams } from "@atika/pricing";
import { getDb } from "../db";

export interface LotPricingContext {
  id: string;
  name: string;
  params: LotPricingParams;
  /** Units bought by the lot's products (all of them, or all except `excludeProductId`). */
  otherUnits: number;
}

const lotSelect = {
  id: true,
  name: true,
  exchangeRate: true,
  saleFactor: true,
  vatRate: true,
  costRate: true,
  totalShippingUsd: true,
} as const;

function toContext(
  lot: {
    id: string;
    name: string;
    exchangeRate: { toNumber(): number };
    saleFactor: { toNumber(): number };
    vatRate: { toNumber(): number };
    costRate: { toNumber(): number };
    totalShippingUsd: { toNumber(): number };
  },
  otherUnits: number,
): LotPricingContext {
  return {
    id: lot.id,
    name: lot.name,
    otherUnits,
    params: {
      exchangeRate: lot.exchangeRate.toNumber(),
      saleFactor: lot.saleFactor.toNumber(),
      vatRate: lot.vatRate.toNumber(),
      costRate: lot.costRate.toNumber(),
      totalShippingUsd: lot.totalShippingUsd.toNumber(),
    },
  };
}

export interface ProductEdit {
  id: string;
  name: string;
  code: string | null;
  brand: string | null;
  color: string | null;
  category: string | null;
  description: string | null;
  originalValueUsd: number;
  sizes: { size: string; unitsBought: number; stock: number; barcode: string }[];
  photos: { id: string; url: string; focusX: number; focusY: number; fit: number | null }[];
  lot: LotPricingContext;
}

export async function getProductForEdit(id: string): Promise<ProductEdit | null> {
  const product = await getDb().product.findUnique({
    where: { id },
    include: {
      variants: true,
      images: {
        orderBy: { position: "asc" },
        select: { id: true, url: true, focusX: true, focusY: true, fit: true },
      },
      lot: { select: lotSelect },
    },
  });
  if (!product) return null;
  const lotUnits = await getDb().productVariant.aggregate({
    where: { product: { lotId: product.lotId } },
    _sum: { unitsBought: true },
  });
  const own = product.variants.reduce((sum, variant) => sum + variant.unitsBought, 0);
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    brand: product.brand,
    color: product.color,
    category: product.category,
    description: product.description,
    originalValueUsd: product.originalValueUsd.toNumber(),
    sizes: product.variants.map(({ size, unitsBought, stock, barcode }) => ({
      size,
      unitsBought,
      stock,
      barcode,
    })),
    photos: product.images,
    lot: toContext(product.lot, (lotUnits._sum.unitsBought ?? 0) - own),
  };
}

/** Every lot with its pricing parameters and units, for the new product form. */
export async function getLotPricingContexts(): Promise<LotPricingContext[]> {
  const lots = await getDb().lot.findMany({
    orderBy: { purchasedAt: "desc" },
    select: { ...lotSelect, products: { select: { variants: { select: { unitsBought: true } } } } },
  });
  return lots.map((lot) =>
    toContext(
      lot,
      lot.products.reduce(
        (sum, product) => sum + product.variants.reduce((s, v) => s + v.unitsBought, 0),
        0,
      ),
    ),
  );
}

export interface ProductLabelData {
  name: string;
  catalogName: string | null;
  priceGs: number;
  variants: { size: string; barcode: string; stock: number }[];
}

/** What the label PDF needs: the product's names, price and each size's barcode. */
export async function getProductLabelData(id: string): Promise<ProductLabelData | null> {
  const product = await getDb().product.findUnique({
    where: { id },
    select: {
      name: true,
      catalogName: true,
      priceGs: true,
      variants: { select: { size: true, barcode: true, stock: true } },
    },
  });
  return product;
}
