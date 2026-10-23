import { priceLot } from "@atika/pricing";
import { ensureBrand } from "../src/brands";
import type { Prisma } from "../src/index";
import type { ChoicePlan } from "./categories/choices";
import type { ParsedLot } from "./excel/parse";
import type { ImagePlan } from "./images/seed-images";

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export interface LotTotals {
  lot: string;
  products: number;
  unitsBought: number;
  unitsSold: number;
  unitsInStock: number;
  costUsd: number;
  investmentUsd: number;
}

type Tx = Prisma.TransactionClient;

/** Removes every imported row, in dependency order. */
export async function clearImported(tx: Tx): Promise<void> {
  await tx.sale.deleteMany();
  await tx.productImage.deleteMany();
  await tx.productVariant.deleteMany();
  await tx.product.deleteMany();
  await tx.lot.deleteMany();
  await tx.supplier.deleteMany();
}

/** Creates one parsed lot with its supplier, products, variants, images and sales. */
export async function importLot(
  tx: Tx,
  parsed: ParsedLot,
  images: ImagePlan,
  choices?: ChoicePlan,
): Promise<LotTotals> {
  if (!parsed.purchasedAt) throw new Error(`${parsed.lotName}: no purchase date available`);
  const supplier = await tx.supplier.create({ data: { name: parsed.supplier } });
  const lot = await tx.lot.create({
    data: {
      supplierId: supplier.id,
      name: parsed.lotName,
      purchasedAt: toDate(parsed.purchasedAt),
      exchangeRate: parsed.exchangeRate,
      saleFactor: parsed.saleFactor,
      vatRate: parsed.vatRate,
      costRate: parsed.costRate,
      totalShippingUsd: parsed.totalShippingUsd,
    },
  });

  const priced = priceLot(
    {
      exchangeRate: parsed.exchangeRate,
      saleFactor: parsed.saleFactor,
      vatRate: parsed.vatRate,
      costRate: parsed.costRate,
      totalShippingUsd: parsed.totalShippingUsd,
    },
    parsed.products.map((product, index) => ({
      id: String(index),
      originalValueUsd: product.originalValueUsd,
      units: product.variants.reduce((sum, v) => sum + v.unitsBought, 0),
    })),
  );

  const total: LotTotals = {
    lot: parsed.lotName,
    products: parsed.products.length,
    unitsBought: 0,
    unitsSold: 0,
    unitsInStock: 0,
    costUsd: 0,
    investmentUsd: parsed.totalShippingUsd,
  };
  const variantIds = new Map<string, string>();
  const prices: number[] = [];

  for (const [index, product] of parsed.products.entries()) {
    const price = priced[index]?.priceGs;
    if (price === undefined) throw new Error(`${parsed.lotName}: no price for product ${index}`);
    prices.push(price);
    const choice = choices?.get(parsed.lotName, index);
    await ensureBrand(tx, product.brand ?? parsed.supplier);
    const created = await tx.product.create({
      data: {
        lotId: lot.id,
        code: product.code,
        name: product.name,
        brand: product.brand ?? parsed.supplier,
        color: product.color,
        originalValueUsd: product.originalValueUsd,
        priceGs: price,
        isPublished: choice?.isPublished ?? false,
        category: choice?.category ?? null,
        ...(choice?.lookbook ?? {}),
        variants: {
          create: product.variants.map((variant) => ({
            size: variant.size,
            unitsBought: variant.unitsBought,
            stock: variant.unitsBought - variant.sold,
          })),
        },
        images: { create: images.get(parsed.lotName, index) },
      },
      include: { variants: true },
    });
    for (const variant of created.variants) variantIds.set(`${index}|${variant.size}`, variant.id);

    for (const variant of product.variants) {
      total.unitsBought += variant.unitsBought;
      total.unitsSold += variant.sold;
      total.unitsInStock += variant.unitsBought - variant.sold;
      const unitCost = product.originalValueUsd * parsed.costRate;
      total.costUsd += unitCost * variant.unitsBought;
      total.investmentUsd += unitCost * variant.unitsBought;
    }
  }

  await tx.sale.createMany({
    data: parsed.sales.map((sale) => {
      const variantId = variantIds.get(`${sale.productIndex}|${sale.size}`);
      const listPriceGs = prices[sale.productIndex];
      if (!variantId || listPriceGs === undefined) {
        throw new Error(`${parsed.lotName}: sale references an unknown variant ${sale.size}`);
      }
      return {
        variantId,
        quantity: sale.quantity,
        soldAt: toDate(sale.soldAt ?? parsed.purchasedAt ?? ""),
        listPriceGs,
        chargedGs: null,
        notes: sale.note,
      };
    }),
  });
  return total;
}
