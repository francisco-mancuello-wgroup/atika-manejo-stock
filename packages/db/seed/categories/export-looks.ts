import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { extractPdf, popplerVersion } from "../images-pdf/poppler";
import { parseLookIndex } from "./looks";
import { CASA_ICONA_LOOKS_FILE, CATALOG_CATEGORIES_DATA_DIR } from "./paths";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });

const pdfDir = process.env.ATIKA_PDF_DIR;
if (!pdfDir) throw new Error("ATIKA_PDF_DIR is required (set it in the root .env)");

console.log(`Using ${await popplerVersion()}`);
const workDir = await mkdtemp(join(tmpdir(), "atika-looks-"));
try {
  const pages = await extractPdf(join(pdfDir, "atika.pdf"), workDir);
  const looks = parseLookIndex(pages.map((p) => p.layout));
  await mkdir(CATALOG_CATEGORIES_DATA_DIR, { recursive: true });
  await writeFile(
    CASA_ICONA_LOOKS_FILE,
    `${JSON.stringify({ source: "atika.pdf", looks }, null, 2)}\n`,
  );
  console.log(`${looks.length} looks written to ${CASA_ICONA_LOOKS_FILE}`);
} finally {
  await rm(workDir, { recursive: true, force: true });
}
