import { CURRENCY_COOKIE, parseCurrency, resolveCurrency } from "./currency";
import { formatGs, formatMoney, formatUsd, moneyFormatter } from "./format";

describe("parseCurrency", () => {
  it("accepts gs and usd, anything else is gs", () => {
    expect(parseCurrency("usd")).toBe("usd");
    expect(parseCurrency("gs")).toBe("gs");
    expect(parseCurrency("eur")).toBe("gs");
    expect(parseCurrency(undefined)).toBe("gs");
  });

  it("uses a stable cookie name", () => {
    expect(CURRENCY_COOKIE).toBe("currency");
  });
});

describe("resolveCurrency", () => {
  it("honours usd only when an exchange rate is available", () => {
    expect(resolveCurrency("usd", 7400)).toBe("usd");
    expect(resolveCurrency("usd", undefined)).toBe("gs");
    expect(resolveCurrency("usd", 0)).toBe("gs");
    expect(resolveCurrency("gs", 7400)).toBe("gs");
    expect(resolveCurrency(undefined, 7400)).toBe("gs");
  });
});

describe("formatMoney", () => {
  it("shows guaraníes unchanged in gs mode", () => {
    expect(formatMoney(2518000, "gs", 7400)).toBe(formatGs(2518000));
  });

  it("converts guaraníes to dollars with the exchange rate in usd mode", () => {
    expect(formatMoney(740000, "usd", 7400)).toBe(formatUsd(100));
    expect(formatMoney(-740000, "usd", 7400)).toBe("-US$ 100,00");
  });

  it("falls back to guaraníes without a usable rate", () => {
    expect(formatMoney(740000, "usd", undefined)).toBe(formatGs(740000));
    expect(formatMoney(740000, "usd", 0)).toBe(formatGs(740000));
  });
});

describe("moneyFormatter", () => {
  it("binds currency and rate", () => {
    expect(moneyFormatter("usd", 7400)(37000)).toBe(formatUsd(5));
    expect(moneyFormatter("gs", 7400)(37000)).toBe(formatGs(37000));
  });
});
