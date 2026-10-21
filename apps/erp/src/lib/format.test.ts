import { formatDate, formatGs, formatInteger, formatUsd } from "./format";

describe("formatGs", () => {
  it("prefixes the guaraní sign and groups thousands with dots", () => {
    expect(formatGs(2518000)).toBe("₲\u00a02.518.000");
    expect(formatGs(0)).toBe("₲\u00a00");
    expect(formatGs(950)).toBe("₲\u00a0950");
  });

  it("rounds to whole guaraníes", () => {
    expect(formatGs(1000.6)).toBe("₲\u00a01.001");
  });

  it("puts the minus sign before the currency", () => {
    expect(formatGs(-12000)).toBe("-₲\u00a012.000");
  });
});

describe("formatUsd", () => {
  it("uses a decimal comma and two decimals", () => {
    expect(formatUsd(123.74)).toBe("US$\u00a0123,74");
    expect(formatUsd(5)).toBe("US$\u00a05,00");
  });

  it("groups thousands with dots", () => {
    expect(formatUsd(1234.5)).toBe("US$\u00a01.234,50");
  });
});

describe("formatInteger", () => {
  it("groups thousands with dots", () => {
    expect(formatInteger(1234567)).toBe("1.234.567");
  });
});

describe("formatDate", () => {
  it("turns an ISO date into dd/mm/yyyy", () => {
    expect(formatDate("2026-06-23")).toBe("23/06/2026");
  });
});

describe("money formatting in tables", () => {
  it("keeps the currency symbol and the amount on the same line", () => {
    expect(formatGs(2518000)).toBe("₲\u00a02.518.000");
    expect(formatUsd(123.74)).toBe("US$\u00a0123,74");
  });
});
