import { describe, expect, it } from "vitest";
import { parseBank } from "./schema";

describe("parseBank", () => {
  it("trims the name", () => {
    expect(parseBank({ name: "  Itaú  " })).toEqual({ success: true, data: { name: "Itaú" } });
  });

  it("requires a name", () => {
    expect(parseBank({ name: "   " })).toEqual({
      success: false,
      fieldErrors: { name: "Escribí el nombre del banco." },
    });
    expect(parseBank({})).toMatchObject({ success: false });
  });

  it("limits the name to 60 characters", () => {
    expect(parseBank({ name: "x".repeat(61) })).toMatchObject({
      success: false,
      fieldErrors: { name: "El nombre no puede superar 60 caracteres." },
    });
  });
});
