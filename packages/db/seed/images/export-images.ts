import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { readWorkbooks } from "../excel/load";
import { findDataSheet, parseInventoryWorkbook } from "../excel/parse";
import { extractSheetImages } from "./anchors";
import { type LotImagePlan, planLotImages, writeExport } from "./export";
import { PRODUCT_IMAGES_DIR } from "./paths";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });

const dir = process.env.ATIKA_EXCEL_DIR;
if (!dir) throw new Error("ATIKA_EXCEL_DIR is required (set it in the root .env)");

const plans: LotImagePlan[] = [];
for (const { source, workbook } of await readWorkbooks(dir)) {
  const lot = parseInventoryWorkbook(workbook, source.options);
  const images = extractSheetImages(workbook, findDataSheet(workbook));
  plans.push(planLotImages(lot.lotName, lot.products, images));
}

const manifest = await writeExport(PRODUCT_IMAGES_DIR, plans);

for (const lot of manifest.lots) {
  const sourceMb = lot.images.reduce((sum, i) => sum + i.sourceBytes, 0) / 1_048_576;
  const outMb = lot.images.reduce((sum, i) => sum + i.bytes, 0) / 1_048_576;
  console.log(
    `[${lot.lot}] ${lot.images.length} images (${sourceMb.toFixed(2)} MB -> ${outMb.toFixed(2)} MB)`,
  );
  for (const image of lot.unmatchedImages) {
    console.warn(
      `[${lot.lot}] image at row ${image.row}, column ${image.col}: no product on that row`,
    );
  }
  for (const product of lot.productsWithoutImage) {
    console.warn(`[${lot.lot}] product without image: ${product.name}`);
  }
}
console.log(`Written to ${PRODUCT_IMAGES_DIR}`);
