import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPrismaClient } from "../src/index";
import { loadLots } from "./excel/load";
import type { ParsedLot } from "./excel/parse";
import {
  APP_MEDIA_DIRS,
  BRAND_PDF_MEDIA_SUBDIR,
  MEDIA_URL_PREFIX,
  PRODUCT_IMAGES_DIR,
} from "./images/paths";
import {
  copyProductImages,
  EMPTY_IMAGE_PLAN,
  type ImagePlan,
  mediaFilesFor,
  mergeImagePlans,
  planProductImages,
  readManifest,
  readPdfManifest,
} from "./images/seed-images";
import { PRODUCT_IMAGES_NEW_DIR } from "./images-pdf/paths";
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

  // Brand PDF photos (data/product-images-new) win; workbook photos fill the products without one.
  const manifest = await readManifest(PRODUCT_IMAGES_DIR);
  const pdfManifest = await readPdfManifest(PRODUCT_IMAGES_NEW_DIR);
  const workbookImages = manifest ? planProductImages(manifest, lots) : EMPTY_IMAGE_PLAN;
  const pdfImages = pdfManifest
    ? planProductImages(pdfManifest, lots, BRAND_PDF_MEDIA_SUBDIR)
    : EMPTY_IMAGE_PLAN;
  const images = mergeImagePlans(pdfImages, workbookImages);
  if (!manifest) console.warn("No data/product-images manifest: workbook photos are not used");
  if (!pdfManifest)
    console.warn("No data/product-images-new manifest: brand PDF photos are not used");

  const prisma = createPrismaClient(requireEnv("DATABASE_URL"));
  try {
    const totals = await reload(prisma, lots, images);
    await upsertAdmin(prisma);
    if (manifest || pdfManifest) {
      const files = mediaFilesFor(images, lots, [
        { urlPrefix: `${MEDIA_URL_PREFIX}/${BRAND_PDF_MEDIA_SUBDIR}`, dir: PRODUCT_IMAGES_NEW_DIR },
        { urlPrefix: MEDIA_URL_PREFIX, dir: PRODUCT_IMAGES_DIR },
      ]);
      await copyProductImages(APP_MEDIA_DIRS, files);
      const fromPdf = files.filter((f) => f.to.startsWith(`${BRAND_PDF_MEDIA_SUBDIR}/`)).length;
      console.log(
        `${files.length} product images linked and copied to the apps' public/media ` +
          `(${fromPdf} from brand PDFs, ${files.length - fromPdf} from workbooks)`,
      );
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
