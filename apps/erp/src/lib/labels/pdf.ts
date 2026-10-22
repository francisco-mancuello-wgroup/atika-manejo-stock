import { PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib";
import bwipjs from "bwip-js/node";
import { formatInteger } from "../format";
import { barRuns, fitText, LABEL_SIZE_MM, type LabelContent, type LabelSizeMm } from "./layout";

const PT_PER_MM = 72 / 25.4;
const MARGIN_MM = 2;
/** Quiet zone on each side of the bars, in modules (Code 128 asks for at least 10). */
const QUIET_MODULES = 10;
const MAX_MODULE_MM = 0.4;
const BARCODE_HEIGHT_MM = 9;

/** Code 128 bar/space widths in modules (bar first), from bwip-js; the encoding itself is not ours. */
export function code128Widths(code: string): number[] {
  const [symbol] = bwipjs.raw({ bcid: "code128", text: code }) as { sbs: number[] }[];
  if (!symbol) throw new Error(`Could not encode barcode ${code}`);
  return symbol.sbs;
}

/** One page per label, vector bars. Sizes are millimetres; `LABEL_SIZE_MM` is the default label. */
export async function renderLabelsPdf(
  labels: readonly LabelContent[],
  size: LabelSizeMm = LABEL_SIZE_MM,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(regular.getCharacterSet());
  // Standard fonts only encode WinAnsi: anything else (emoji, CJK) would make drawText throw.
  const printable = (text: string) =>
    [...text].map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : "?")).join("");

  const width = size.width * PT_PER_MM;
  const height = size.height * PT_PER_MM;
  const margin = MARGIN_MM * PT_PER_MM;
  const inner = width - 2 * margin;
  const black = rgb(0, 0, 0);

  for (const label of labels) {
    const page = pdf.addPage([width, height]);
    let y = height - margin - 7;

    const name = fitText(printable(label.name), inner, (text) => bold.widthOfTextAtSize(text, 7));
    page.drawText(name, { x: margin, y, size: 7, font: bold, color: black });

    y -= 9.5;
    const price = `Gs ${formatInteger(label.priceGs)}`;
    page.drawText(printable(`Talle ${label.size}`), {
      x: margin,
      y,
      size: 8,
      font: regular,
      color: black,
    });
    page.drawText(price, {
      x: width - margin - regular.widthOfTextAtSize(price, 8),
      y,
      size: 8,
      font: bold,
      color: black,
    });

    const widths = code128Widths(label.barcode);
    const modules = widths.reduce((sum, w) => sum + w, 0);
    const moduleWidth = Math.min(MAX_MODULE_MM * PT_PER_MM, inner / (modules + 2 * QUIET_MODULES));
    const barsLeft = (width - modules * moduleWidth) / 2;
    const barsHeight = BARCODE_HEIGHT_MM * PT_PER_MM;
    const barsBottom = y - 4 - barsHeight;
    for (const run of barRuns(widths)) {
      page.drawRectangle({
        x: barsLeft + run.start * moduleWidth,
        y: barsBottom,
        width: run.width * moduleWidth,
        height: barsHeight,
        color: black,
        borderWidth: 0,
      });
    }

    const code = label.barcode;
    const codeWidth = regular.widthOfTextAtSize(code, 7);
    page.drawText(code, {
      x: (width - codeWidth) / 2,
      y: barsBottom - 8,
      size: 7,
      font: regular,
      color: black,
    });
  }
  return pdf.save();
}
