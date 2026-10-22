import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPrismaClient } from "../src/index";
import { upsertAdmin } from "./admin";
import { seedBanks } from "./banks/seed-banks";
import { buildReport, type CategoryReport, formatReport, planChoices } from "./categories/choices";
import {
  EMPTY_LOOKBOOK_PLAN,
  formatLookbookReport,
  type LookbookPlan,
  lookbookImages,
  planLookbook,
  readLookbook,
} from "./categories/lookbook";
import { type Look, readLooks } from "./categories/looks";
import { CASA_ICONA_LOOKS_FILE, LOOKBOOK_FILE } from "./categories/paths";
import { readPreserved } from "./categories/preserve";
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
import { clearImported, importLot, type LotTotals } from "./reload";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const CATALOG_SETTINGS = {
  // Atika sales WhatsApp (0992442692)
  whatsappNumber: "+595 992 442692",
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

/**
 * Replaces every imported row with the parsed lots in a single transaction. Publication state and
 * categories chosen in the admin survive: they are read before the delete and restored by key.
 */
async function reload(
  prisma: Client,
  lots: ParsedLot[],
  images: ImagePlan,
  looks: Look[],
  lookbook: LookbookPlan,
): Promise<{ totals: LotTotals[]; report: CategoryReport }> {
  return prisma.$transaction(
    async (tx) => {
      const choices = planChoices(lots, looks, await readPreserved(tx), lookbook);
      await clearImported(tx);
      const totals: LotTotals[] = [];
      for (const parsed of lots) totals.push(await importLot(tx, parsed, images, choices));

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
      return { totals, report: buildReport(lots, choices) };
    },
    // maxWait: a remote pooler (Supabase) can take longer than the 2 s default to open it.
    { timeout: 120_000, maxWait: 30_000 },
  );
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
  const lookbookData = await readLookbook(LOOKBOOK_FILE);
  const lookbook = lookbookData ? planLookbook(lots, lookbookData) : EMPTY_LOOKBOOK_PLAN;
  if (!lookbookData)
    console.warn("No data/catalogs/lookbook.json: lookbook placements are not set");
  // PDF page photos of the lookbook come first (Milonga pages, Casa Icona looks without a caption).
  const images = mergeImagePlans(
    lookbookImages(lookbook, BRAND_PDF_MEDIA_SUBDIR),
    mergeImagePlans(pdfImages, workbookImages),
  );
  if (!manifest) console.warn("No data/product-images manifest: workbook photos are not used");
  if (!pdfManifest)
    console.warn("No data/product-images-new manifest: brand PDF photos are not used");

  const looks = await readLooks(CASA_ICONA_LOOKS_FILE);
  if (!looks)
    console.warn("No data/catalog-categories looks: Casa Icona categories are not inferred");

  const prisma = createPrismaClient(requireEnv("DATABASE_URL"));
  try {
    const { totals, report } = await reload(prisma, lots, images, looks ?? [], lookbook);
    await upsertAdmin(prisma, requireEnv("ADMIN_EMAIL"), requireEnv("ADMIN_PASSWORD"));
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
    console.log(await seedBanks(prisma));
    console.log(formatReport(report));
    console.log(formatLookbookReport(lookbook));
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
