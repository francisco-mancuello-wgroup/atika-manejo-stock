import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { loadLots } from "../excel/load";
import { writePdfExport } from "./export-pdf";
import { PRODUCT_IMAGES_NEW_DIR } from "./paths";
import { type PdfLotPlan, planPdfLot } from "./plan";
import { extractPdf, popplerVersion } from "./poppler";
import { PDF_SOURCES } from "./sources";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required (set it in the root .env)`);
  return value;
}

const pdfDir = requireEnv("ATIKA_PDF_DIR");
const lots = await loadLots(requireEnv("ATIKA_EXCEL_DIR"));
console.log(`Using ${await popplerVersion()}`);

const plans: PdfLotPlan[] = [];
const workDirs: string[] = [];
try {
  for (const source of PDF_SOURCES) {
    const lot = lots.find((l) => l.lotName === source.lotName);
    if (!lot) throw new Error(`Lot "${source.lotName}" is not in the workbooks`);
    const workDir = await mkdtemp(join(tmpdir(), "atika-pdf-"));
    workDirs.push(workDir);
    const pages = await extractPdf(join(pdfDir, source.pdf), workDir);
    const plan = planPdfLot(source, lot.products, pages);
    plans.push(plan);
  }

  const manifest = await writePdfExport(PRODUCT_IMAGES_NEW_DIR, plans, (src) => readFile(src));

  for (const lot of manifest.lots) {
    const { stats } = lot;
    console.log(
      `[${lot.lot}] ${lot.pdf}: ${stats.imagesFound} photos, ${stats.logosSkipped} logos skipped, ` +
        `${stats.matched} matched, ${stats.unmatched} unmatched`,
    );
    for (const image of lot.images) {
      console.log(
        `  p${image.page} "${image.caption}" -> ${image.name} (${image.rule}) ${image.file}`,
      );
    }
    for (const image of lot.unmatchedImages) {
      console.warn(`  unmatched photo p${image.page} (${image.reason}): ${image.caption ?? "-"}`);
    }
    for (const caption of lot.captionsWithoutImage) {
      console.warn(`  caption without photo p${caption.page}: ${caption.caption}`);
    }
    for (const product of lot.productsWithoutImage) {
      console.warn(`  product without PDF photo: ${product.name}`);
    }
  }
  console.log(`Written to ${PRODUCT_IMAGES_NEW_DIR}`);
} finally {
  await Promise.all(workDirs.map((dir) => rm(dir, { recursive: true, force: true })));
}
