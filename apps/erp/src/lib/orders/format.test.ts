import { describe, expect, it } from "vitest";
import { formatOrderNumber, orderStatusLabel, parseStatusFilter } from "./format";

describe("formatOrderNumber", () => {
  it("pads to four digits like the catalog's WhatsApp message", () => {
    expect(formatOrderNumber(42)).toBe("#0042");
    expect(formatOrderNumber(12345)).toBe("#12345");
  });
});

describe("orderStatusLabel", () => {
  it("speaks Spanish", () => {
    expect(orderStatusLabel("pending")).toBe("Pendiente");
    expect(orderStatusLabel("approved")).toBe("Aprobado");
    expect(orderStatusLabel("rejected")).toBe("Rechazado");
  });
});

describe("parseStatusFilter", () => {
  it("accepts a known status from the URL", () => {
    expect(parseStatusFilter({ estado: "approved" })).toBe("approved");
    expect(parseStatusFilter({ estado: ["rejected", "pending"] })).toBe("rejected");
  });

  it("treats anything else as no filter", () => {
    expect(parseStatusFilter({})).toBeUndefined();
    expect(parseStatusFilter({ estado: "todos" })).toBeUndefined();
    expect(parseStatusFilter({ estado: "" })).toBeUndefined();
  });
});
