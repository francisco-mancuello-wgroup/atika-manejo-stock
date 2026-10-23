import { describe, expect, it } from "vitest";
import { parseCatalogSettings, parseCategory } from "./schema";

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
