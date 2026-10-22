import { describe, expect, it } from "vitest";
import { parseGroup } from "./schema";

describe("parseGroup", () => {
  it("trims the name and treats blank dates as an open window", () => {
    expect(parseGroup({ name: "  Verano  ", startsAt: "", endsAt: "" })).toEqual({
      success: true,
      data: { name: "Verano", startsAt: null, endsAt: null },
    });
  });

  it("parses the window dates", () => {
    const result = parseGroup({
      name: "Verano",
      startsAt: "2026-11-01T08:00",
      endsAt: "2026-11-30T23:59",
    });
    expect(result.success && result.data.startsAt).toEqual(new Date("2026-11-01T08:00"));
    expect(result.success && result.data.endsAt).toEqual(new Date("2026-11-30T23:59"));
  });

  it("requires a name", () => {
    expect(parseGroup({ name: " " })).toEqual({
      success: false,
      fieldErrors: { name: "Escribí el nombre del grupo." },
    });
  });

  it("limits the name length", () => {
    const result = parseGroup({ name: "x".repeat(81) });
    expect(result).toEqual({
      success: false,
      fieldErrors: { name: "El nombre no puede superar 80 caracteres." },
    });
  });

  it("refuses an invalid date", () => {
    expect(parseGroup({ name: "A", startsAt: "ayer" })).toEqual({
      success: false,
      fieldErrors: { startsAt: "Ingresá una fecha válida." },
    });
  });

  it("refuses an end before the start", () => {
    expect(
      parseGroup({ name: "A", startsAt: "2026-11-10T00:00", endsAt: "2026-11-09T00:00" }),
    ).toEqual({
      success: false,
      fieldErrors: { endsAt: "El fin no puede ser anterior al inicio." },
    });
  });
});
