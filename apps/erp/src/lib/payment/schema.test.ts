import { describe, expect, it } from "vitest";
import { parsePaymentDetails } from "./schema";

const filled = {
  holderName: " SZUT EAS ",
  bank: "Basa",
  accountGs: "2155009507",
  accountUsd: "12155002091",
  ruc: "80132068-2",
};

describe("parsePaymentDetails", () => {
  it("parses the bank details, trimming text", () => {
    expect(parsePaymentDetails(filled)).toEqual({
      success: true,
      data: { ...filled, holderName: "SZUT EAS" },
    });
  });

  it("asks for every field", () => {
    const result = parsePaymentDetails({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual(
      ["accountGs", "accountUsd", "bank", "holderName", "ruc"].sort(),
    );
    expect(result.fieldErrors.holderName).toBe("Ingresá la razón social.");
  });

  it("keeps accounts and RUC to digits, spaces and dashes", () => {
    const result = parsePaymentDetails({ ...filled, accountGs: "21550-095O7", ruc: "80132068/2" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.accountGs).toBe("Usá solo dígitos, espacios y guiones.");
    expect(result.fieldErrors.ruc).toBe("Usá solo dígitos, espacios y guiones.");
  });
});
