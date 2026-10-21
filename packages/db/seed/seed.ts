import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPrismaClient } from "../src/index";
import { loadLots } from "./excel/load";
import type { ParsedLot } from "./excel/parse";
import { APP_MEDIA_DIRS, PRODUCT_IMAGES_DIR } from "./images/paths";
import {
  copyProductImages,
  EMPTY_IMAGE_PLAN,
  type ImagePlan,
  planProductImages,
  readManifest,
} from "./images/seed-images";
import { hashPassword } from "./password";
import { clearImported, importLot, type LotTotals } from "./reload";

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

type Client = ReturnType<typeof createPrismaClient>;

/** Replaces every imported row with the parsed lots in a single transaction. */
async function reload(prisma: Client, lots: ParsedLot[], images: ImagePlan): Promise<LotTotals[]> {
  return prisma.$transaction(
    async (tx) => {
      await clearImported(tx);
      const totals: LotTotals[] = [];
      for (const parsed of lots) totals.push(await importLot(tx, parsed, images));

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

  const manifest = await readManifest(PRODUCT_IMAGES_DIR);
  const images = manifest ? planProductImages(manifest, lots) : EMPTY_IMAGE_PLAN;
  if (!manifest) console.warn("No data/product-images manifest: seeding without product photos");

  const prisma = createPrismaClient(requireEnv("DATABASE_URL"));
  try {
    const totals = await reload(prisma, lots, images);
    await upsertAdmin(prisma);
    if (manifest) {
      const files = manifest.lots.flatMap((lot) => lot.images.map((image) => image.file));
      await copyProductImages(PRODUCT_IMAGES_DIR, APP_MEDIA_DIRS, files);
      console.log(`${files.length} product images linked and copied to the apps' public/media`);
    }
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
