import { PDFDocument } from "@cantoo/pdf-lib";
import { LABEL_SIZE_MM } from "./layout";
import { code128Widths, renderLabelsPdf } from "./pdf";

const label = {
  name: "Vestido de lino con un nombre bastante largo para una etiqueta",
  size: "M",
  priceGs: 250_000,
  barcode: "AT000123",
};

const MM = 72 / 25.4;

describe("code128Widths", () => {
  it("encodes the code as whole Code 128 symbols plus the stop pattern", () => {
    const widths = code128Widths("AT000123");
    // Each symbol is 6 elements (bar, space, ...) of 11 modules; the stop is 7 elements of 13.
    expect((widths.length - 7) % 6).toBe(0);
    expect((widths.reduce((sum, w) => sum + w, 0) - 13) % 11).toBe(0);
    expect(widths.slice(-7).reduce((sum, w) => sum + w, 0)).toBe(13);
  });

  it("is deterministic for the same code and differs between codes", () => {
    expect(code128Widths("AT000123")).toEqual(code128Widths("AT000123"));
    expect(code128Widths("AT000124")).not.toEqual(code128Widths("AT000123"));
  });
});

describe("renderLabelsPdf", () => {
  it("makes one page per label at the label size", async () => {
    const bytes = await renderLabelsPdf([label, { ...label, size: "S" }, label]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(LABEL_SIZE_MM.width * MM, 1);
    expect(height).toBeCloseTo(LABEL_SIZE_MM.height * MM, 1);
  });

  it("honours another label size", async () => {
    const bytes = await renderLabelsPdf([label], { width: 60, height: 40 });
    const { width, height } = (await PDFDocument.load(bytes)).getPage(0).getSize();
    expect(width).toBeCloseTo(60 * MM, 1);
    expect(height).toBeCloseTo(40 * MM, 1);
  });

  it("survives characters the PDF font cannot encode", async () => {
    const bytes = await renderLabelsPdf([{ ...label, name: "Vestido 🌸 ñandú" }]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
