import { normalizeLabel } from "./cells";

const SIZES = new Set(["XS", "S", "M", "L", "XL", "XS/S", "M/L"]);
const ONE_SIZE = new Set(["U", "UNICO", "UNICA"]);

/**
 * Canonical size: XS, S, M, L, XL or U (one size). The combined labels `XS/S` and `M/L` used by
 * one supplier are kept as they are, because mapping them to a single size would invent stock.
 */
export function normalizeSize(raw: string): string | null {
  const label = normalizeLabel(raw).replace(/\s+/g, "");
  if (ONE_SIZE.has(label)) return "U";
  return SIZES.has(label) ? label : null;
}
