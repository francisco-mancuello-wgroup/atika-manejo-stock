/** Pricing parameters set per purchase lot. Rates are fractions (0.1 = 10 %). */
export interface LotPricingParams {
  /** Guaraníes per US dollar. */
  exchangeRate: number;
  /** Multiplier applied over unit cost. */
  saleFactor: number;
  /** IVA included in the sale price. */
  vatRate: number;
  /** Share of the original value actually paid. */
  costRate: number;
  totalShippingUsd: number;
}

export interface LotModel {
  id: string;
  originalValueUsd: number;
  /** Units bought in the lot (not current stock): shipping is prorated over them. */
  units: number;
}

export interface PricedModel {
  id: string;
  shippingPerUnitUsd: number;
  unitCostUsd: number;
  priceGs: number;
}

const GS_ROUNDING_STEP = 1000;

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative number, got ${value}`);
  }
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}

export function shippingPerUnit(totalShippingUsd: number, units: number): number {
  assertNonNegative("totalShippingUsd", totalShippingUsd);
  if (!Number.isInteger(units) || units <= 0) {
    throw new RangeError(`units must be a positive integer, got ${units}`);
  }
  return totalShippingUsd / units;
}

export function unitCostUsd(
  originalValueUsd: number,
  costRate: number,
  shippingPerUnitUsd: number,
): number {
  assertNonNegative("originalValueUsd", originalValueUsd);
  assertNonNegative("costRate", costRate);
  assertNonNegative("shippingPerUnitUsd", shippingPerUnitUsd);
  return originalValueUsd * costRate + shippingPerUnitUsd;
}

export function roundGs(value: number): number {
  return Math.round(value / GS_ROUNDING_STEP) * GS_ROUNDING_STEP;
}

export function priceGs(
  costUsd: number,
  params: Pick<LotPricingParams, "saleFactor" | "vatRate" | "exchangeRate">,
): number {
  assertNonNegative("costUsd", costUsd);
  assertNonNegative("saleFactor", params.saleFactor);
  assertNonNegative("vatRate", params.vatRate);
  assertPositive("exchangeRate", params.exchangeRate);
  return roundGs(costUsd * params.saleFactor * (1 + params.vatRate) * params.exchangeRate);
}

/** Prices every model of a lot; call it again after saving new parameters. */
export function priceLot(params: LotPricingParams, models: readonly LotModel[]): PricedModel[] {
  if (models.length === 0) return [];

  const totalUnits = models.reduce((sum, model) => sum + model.units, 0);
  const shipping = shippingPerUnit(params.totalShippingUsd, totalUnits);

  return models.map((model) => {
    const cost = unitCostUsd(model.originalValueUsd, params.costRate, shipping);
    return {
      id: model.id,
      shippingPerUnitUsd: shipping,
      unitCostUsd: cost,
      priceGs: priceGs(cost, params),
    };
  });
}
export { applyDiscount, type DiscountRule, effectiveDiscount } from "./discount";
