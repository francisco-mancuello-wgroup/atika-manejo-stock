import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { parseLayoutXml } from "./layout";
import { isPhoto } from "./pair";
import type { PdfPageInput, PhotoFile } from "./plan";

const run = promisify(execFile);

/**
 * Reading PDFs shells out to poppler's `pdftohtml` (apt `poppler-utils`, brew `poppler`), which
 * writes each page's text with positions and every embedded image. JPEG images are written
 * byte for byte, so nothing is recompressed before the WebP conversion. A pure JS PDF library
 * would add a large dependency to get the same data.
 */
export async function popplerVersion(): Promise<string> {
  try {
    const { stderr, stdout } = await run("pdftohtml", ["-v"]);
    return (stderr || stdout).split("\n")[0] ?? "pdftohtml";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "pdftohtml not found: install poppler (apt install poppler-utils, brew install poppler)",
      );
    }
    // `pdftohtml -v` exits non-zero on some builds; the version text is still on stderr.
    const { stderr } = error as { stderr?: string };
    if (stderr) return stderr.split("\n")[0] ?? "pdftohtml";
    throw error;
  }
}

/** Runs pdftohtml on `pdfPath` into `workDir`; photo `src` values are absolute paths in it. */
export async function extractPdf(pdfPath: string, workDir: string): Promise<PdfPageInput[]> {
  // Run inside `workDir` with a relative output name so the XML's image `src` values are plain
  // file names.
  await run("pdftohtml", ["-xml", "-q", "-nodrm", pdfPath, "doc"], {
    cwd: workDir,
    maxBuffer: 64 * 1024 * 1024,
  });
  const xml = await readFile(join(workDir, "doc.xml"), "utf8");

  const pages: PdfPageInput[] = [];
  for (const layout of parseLayoutXml(xml)) {
    const photos: PhotoFile[] = [];
    let logosSkipped = 0;
    for (const image of layout.images) {
      const meta = await sharp(join(workDir, image.src)).metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      if (!isPhoto({ width, height })) {
        logosSkipped += 1;
        continue;
      }
      photos.push({
        src: join(workDir, image.src),
        top: image.top,
        left: image.left,
        width,
        height,
        format: image.src.split(".").pop() ?? "unknown",
      });
    }
    pages.push({ layout, photos, logosSkipped });
  }
  return pages;
}
