import { describe, expect, it } from "vitest";
import { parseCatalogSettings, parseCategory, parseLookbook } from "./schema";

const form = {
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}.",
  heroText: "Prendas seleccionadas.",
  showPrices: "on",
  hideOutOfStock: "on",
};

describe("parseCatalogSettings", () => {
  it("maps present checkboxes to true and absent ones to false", () => {
    expect(parseCatalogSettings(form)).toEqual({
      success: true,
      data: {
        whatsappNumber: "+595 981 123 456",
        messageTemplate: "Hola! Me interesa {producto} en talle {talle}.",
        heroText: "Prendas seleccionadas.",
        showPrices: true,
        showSoldOutSizes: false,
        hideOutOfStock: true,
      },
    });
  });

  it("requires a WhatsApp number with at least 8 digits", () => {
    const result = parseCatalogSettings({ ...form, whatsappNumber: "12-34" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors.whatsappNumber).toEqual(expect.any(String));
  });

  it("requires the template and hero text, and the template must mention the product", () => {
    const blank = parseCatalogSettings({ ...form, messageTemplate: " ", heroText: "" });
    expect(blank.success).toBe(false);
    if (!blank.success)
      expect(Object.keys(blank.fieldErrors).sort()).toEqual(["heroText", "messageTemplate"]);

    const noProduct = parseCatalogSettings({ ...form, messageTemplate: "Hola" });
    expect(noProduct.success).toBe(false);
    if (!noProduct.success) expect(noProduct.fieldErrors.messageTemplate).toContain("{producto}");
  });
});

describe("parseCategory", () => {
  it("accepts a known slug or blank for no category, and rejects anything else", () => {
    expect(parseCategory("tops")).toEqual({ success: true, data: "tops" });
    expect(parseCategory("")).toEqual({ success: true, data: null });
    expect(parseCategory("zapatos")).toEqual({ success: false });
  });
});

describe("parseLookbook", () => {
  const filled = {
    catalog: "casa_icona",
    catalogOrder: "12",
    catalogSection: " Vestidos ",
    catalogName: " Vestido Lino ",
  };

  it("parses the lookbook placement, trimming text", () => {
    expect(parseLookbook(filled)).toEqual({
      success: true,
      data: {
        catalog: "casa_icona",
        catalogOrder: 12,
        catalogSection: "Vestidos",
        catalogName: "Vestido Lino",
      },
    });
  });

  it("stores blank or missing fields as null (not in the lookbook)", () => {
    const empty = {
      catalog: "",
      catalogOrder: " ",
      catalogSection: "",
      catalogName: "  ",
    };
    const expected = {
      success: true,
      data: {
        catalog: null,
        catalogOrder: null,
        catalogSection: null,
        catalogName: null,
      },
    };
    expect(parseLookbook(empty)).toEqual(expected);
    expect(parseLookbook({})).toEqual(expected);
  });

  it("accepts each of the three catalogs and rejects anything else", () => {
    for (const catalog of ["casa_icona", "milonga", "sordo"]) {
      expect(parseLookbook({ ...filled, catalog }).success).toBe(true);
    }
    const result = parseLookbook({ ...filled, catalog: "verano" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.fieldErrors)).toEqual(["catalog"]);
  });

  it("requires the page to be a positive whole number", () => {
    for (const catalogOrder of ["0", "-3", "1.5", "abc"]) {
      const result = parseLookbook({ ...filled, catalogOrder });
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(result.fieldErrors)).toEqual(["catalogOrder"]);
    }
  });
});
