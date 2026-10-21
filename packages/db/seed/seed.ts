import { fileURLToPath } from "node:url";
import { priceLot } from "@atika/pricing";
import { config } from "dotenv";
import { createPrismaClient } from "../src/index";
import { loadLots } from "./excel/load";
import type { ParsedLot } from "./excel/parse";
import { hashPassword } from "./password";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const CATALOG_SETTINGS = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?",
  heroText: "Prendas seleccionadas, piezas únicas.",
};

/** Defaults for new lots (fractions). An existing row is kept: the ERP owns it afterwards. */
const APP_SETTINGS = { exchangeRate: 7400, saleFactor: 2.5, vatRate: 0.1, costRate: 1 };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required (set it in the root .env)`);
  return value;
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

interface LotTotals {
  lot: string;
  products: number;
  unitsBought: number;
  unitsSold: number;
  unitsInStock: number;
  costUsd: number;
  investmentUsd: number;
}

type Client = ReturnType<typeof createPrismaClient>;

/** Replaces every imported row with the parsed lots in a single transaction. */
async function reload(prisma: Client, lots: ParsedLot[]): Promise<LotTotals[]> {
  return prisma.$transaction(
    async (tx) => {
      await tx.sale.deleteMany();
      await tx.productImage.deleteMany();
      await tx.productVariant.deleteMany();
      await tx.product.deleteMany();
      await tx.lot.deleteMany();
      await tx.supplier.deleteMany();

      const totals: LotTotals[] = [];
      for (const parsed of lots) {
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
          if (price === undefined)
            throw new Error(`${parsed.lotName}: no price for product ${index}`);
          prices.push(price);
          const created = await tx.product.create({
            data: {
              lotId: lot.id,
              code: product.code,
              name: product.name,
              brand: product.brand ?? parsed.supplier,
              color: product.color,
              originalValueUsd: product.originalValueUsd,
              priceGs: price,
              variants: {
                create: product.variants.map((variant) => ({
                  size: variant.size,
                  unitsBought: variant.unitsBought,
                  stock: variant.unitsBought - variant.sold,
                })),
              },
            },
            include: { variants: true },
          });
          for (const variant of created.variants)
            variantIds.set(`${index}|${variant.size}`, variant.id);

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
        totals.push(total);
      }

      await tx.catalogSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ...CATALOG_SETTINGS },
        update: CATALOG_SETTINGS,
      });
      await tx.appSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ...APP_SETTINGS },
        update: {},
      });
      return totals;
    },
    { timeout: 120_000 },
  );
}

async function upsertAdmin(prisma: Client): Promise<void> {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const passwordHash = await hashPassword(requireEnv("ADMIN_PASSWORD"));
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
}

async function main(): Promise<void> {
  const lots = await loadLots(requireEnv("ATIKA_EXCEL_DIR"));
  for (const lot of lots)
    for (const warning of lot.warnings) console.warn(`[${lot.lotName}] ${warning}`);

  const prisma = createPrismaClient(requireEnv("DATABASE_URL"));
  try {
    const totals = await reload(prisma, lots);
    await upsertAdmin(prisma);
    console.table(
      totals.map((t) => ({
        ...t,
        costUsd: Number(t.costUsd.toFixed(2)),
        investmentUsd: Number(t.investmentUsd.toFixed(2)),
      })),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
