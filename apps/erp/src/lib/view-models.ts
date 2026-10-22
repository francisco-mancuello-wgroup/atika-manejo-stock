import type { LotPricingMode } from "@atika/db";
import { shippingPerUnit, unitCostUsd } from "@atika/pricing";
import { coverUrl } from "./cover";
import { toIsoDate } from "./dates";
import { sortSizes } from "./sizes";

/** Prisma `Decimal` is mapped to numbers here, at the edge. */
export interface DecimalLike {
  toNumber(): number;
}

export interface VariantRow {
  id: string;
  size: string;
  unitsBought: number;
  stock: number;
}

export interface ProductRow {
  id: string;
  code: string | null;
  name: string;
  color: string | null;
  brand: string | null;
  originalValueUsd: DecimalLike;
  priceGs: number;
  variants: VariantRow[];
  /** Loaded by the product lists that show a thumbnail. */
  images?: readonly { url: string; position: number }[];
}

export interface LotRow {
  id: string;
  name: string;
  supplier: { name: string };
  purchasedAt: Date;
  exchangeRate: DecimalLike;
  saleFactor: DecimalLike;
  vatRate: DecimalLike;
  costRate: DecimalLike;
  pricingMode: LotPricingMode;
  totalShippingUsd: DecimalLike;
  products: ProductRow[];
}

export interface LotSummary {
  id: string;
  name: string;
  supplier: string;
  purchasedAt: string;
  exchangeRate: number;
  products: number;
  unitsBought: number;
  unitsSold: number;
  stock: number;
  investmentUsd: number;
  investmentGs: number;
  stockValueGs: number;
}

export interface SummaryTotals {
  stock: number;
  unitsSold: number;
  unitsBought: number;
  investmentUsd: number;
  investmentGs: number;
  stockValueGs: number;
}

const sum = (values: Iterable<number>) => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};

function lotUnits(products: readonly ProductRow[]) {
  const variants = products.flatMap((product) => product.variants);
  return {
    bought: sum(variants.map((v) => v.unitsBought)),
    stock: sum(variants.map((v) => v.stock)),
  };
}

export function toLotSummary(lot: LotRow): LotSummary {
  const { bought, stock } = lotUnits(lot.products);
  const costRate = lot.costRate.toNumber();
  const exchangeRate = lot.exchangeRate.toNumber();
  const goodsUsd = sum(
    lot.products.map((product) => {
      const units = sum(product.variants.map((v) => v.unitsBought));
      return units * product.originalValueUsd.toNumber() * costRate;
    }),
  );
  const investmentUsd = goodsUsd + lot.totalShippingUsd.toNumber();
  return {
    id: lot.id,
    name: lot.name,
    supplier: lot.supplier.name,
    purchasedAt: toIsoDate(lot.purchasedAt),
    exchangeRate,
    products: lot.products.length,
    unitsBought: bought,
    unitsSold: bought - stock,
    stock,
    investmentUsd,
    investmentGs: investmentUsd * exchangeRate,
    stockValueGs: sum(
      lot.products.map((product) => sum(product.variants.map((v) => v.stock)) * product.priceGs),
    ),
  };
}

export function summarizeLots(lots: readonly LotSummary[]): SummaryTotals {
  return {
    stock: sum(lots.map((l) => l.stock)),
    unitsSold: sum(lots.map((l) => l.unitsSold)),
    unitsBought: sum(lots.map((l) => l.unitsBought)),
    investmentUsd: sum(lots.map((l) => l.investmentUsd)),
    investmentGs: sum(lots.map((l) => l.investmentGs)),
    stockValueGs: sum(lots.map((l) => l.stockValueGs)),
  };
}

export interface SizeStock {
  size: string;
  stock: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  lotId: string;
  lotName: string;
  priceGs: number;
  sizes: SizeStock[];
  totalStock: number;
  imageUrl: string | null;
}

function sortedVariants(variants: readonly VariantRow[]): VariantRow[] {
  const order = sortSizes(variants.map((v) => v.size));
  return [...variants].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
}

export function toInventoryProduct(
  product: ProductRow,
  lot: { id: string; name: string },
): InventoryProduct {
  const variants = sortedVariants(product.variants);
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    color: product.color,
    lotId: lot.id,
    lotName: lot.name,
    priceGs: product.priceGs,
    sizes: variants.map((v) => ({ size: v.size, stock: v.stock })),
    totalStock: sum(variants.map((v) => v.stock)),
    imageUrl: coverUrl(product.images),
  };
}

export interface LotParams {
  exchangeRate: number;
  saleFactor: number;
  vatPercent: number;
  costPercent: number;
  totalShippingUsd: number;
}

export interface GridCell {
  stock: number;
  bought: number;
}

export interface LotGridRow {
  id: string;
  name: string;
  code: string | null;
  originalValueUsd: number;
  unitCostUsd: number;
  priceGs: number;
  cells: Record<string, GridCell>;
}

export interface LotDetail {
  id: string;
  name: string;
  supplier: string;
  purchasedAt: string;
  pricingMode: LotPricingMode;
  params: LotParams;
  sizes: string[];
  rows: LotGridRow[];
  summary: LotSummary;
}

/** Fractions are stored; the UI works with percentages (10, not 0.1). */
const toPercent = (fraction: number) => Math.round(fraction * 100 * 10_000) / 10_000;

export function toLotDetail(lot: LotRow): LotDetail {
  const { bought } = lotUnits(lot.products);
  const costRate = lot.costRate.toNumber();
  const shipping = bought > 0 ? shippingPerUnit(lot.totalShippingUsd.toNumber(), bought) : 0;
  const sizes = sortSizes([
    ...new Set(lot.products.flatMap((product) => product.variants.map((v) => v.size))),
  ]);

  return {
    id: lot.id,
    name: lot.name,
    supplier: lot.supplier.name,
    purchasedAt: toIsoDate(lot.purchasedAt),
    pricingMode: lot.pricingMode,
    params: {
      exchangeRate: lot.exchangeRate.toNumber(),
      saleFactor: lot.saleFactor.toNumber(),
      vatPercent: toPercent(lot.vatRate.toNumber()),
      costPercent: toPercent(costRate),
      totalShippingUsd: lot.totalShippingUsd.toNumber(),
    },
    sizes,
    rows: lot.products.map((product) => {
      const originalValueUsd = product.originalValueUsd.toNumber();
      return {
        id: product.id,
        name: product.name,
        code: product.code,
        originalValueUsd,
        unitCostUsd: unitCostUsd(originalValueUsd, costRate, shipping),
        priceGs: product.priceGs,
        cells: Object.fromEntries(
          product.variants.map((v) => [v.size, { stock: v.stock, bought: v.unitsBought }]),
        ),
      };
    }),
    summary: toLotSummary(lot),
  };
}

export interface SaleSource {
  id: string;
  soldAt: Date;
  quantity: number;
  listPriceGs: number;
  chargedGs: number | null;
  customer: string | null;
  notes: string | null;
  variant: { size: string; product: { id: string; name: string } };
}

export interface SaleRow {
  id: string;
  date: string;
  productName: string;
  size: string;
  quantity: number;
  unitPriceGs: number;
  totalGs: number;
  customer: string | null;
}

/** `chargedGs` is the price charged per unit when it differs from the list price. */
export function saleAmountGs(sale: Pick<SaleSource, "quantity" | "listPriceGs" | "chargedGs">) {
  return (sale.chargedGs ?? sale.listPriceGs) * sale.quantity;
}

export function toSaleRow(sale: SaleSource): SaleRow {
  return {
    id: sale.id,
    date: toIsoDate(sale.soldAt),
    productName: sale.variant.product.name,
    size: sale.variant.size,
    quantity: sale.quantity,
    unitPriceGs: sale.chargedGs ?? sale.listPriceGs,
    totalGs: saleAmountGs(sale),
    customer: sale.customer,
  };
}
