import type ExcelJS from "exceljs";
import sharp from "sharp";

/** A flat-colour PNG, used to put real image bytes in in-memory workbooks. */
export async function solidPng(width: number, height: number, background: string): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

/** exceljs types its image buffers with an older Buffer shape than the runtime one. */
export function forExcel(buffer: Buffer): ExcelJS.Buffer {
  return buffer as unknown as ExcelJS.Buffer;
}
