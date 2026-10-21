const SIZE_ORDER = ["XS", "XS/S", "S", "M", "M/L", "L", "XL", "U"];

/** Every size the ERP can store; a size filter in the URL must be one of these. */
export const KNOWN_SIZES: readonly string[] = SIZE_ORDER;

/** The sizes offered as filter chips (the combined ones, XS/S and M/L, are rare). */
export const FILTER_SIZES = ["XS", "S", "M", "L", "XL", "U"] as const;

/** Known sizes from smallest to one-size; unknown ones follow alphabetically. */
export function sortSizes(sizes: readonly string[]): string[] {
  const rank = (size: string) => {
    const index = SIZE_ORDER.indexOf(size);
    return index === -1 ? SIZE_ORDER.length : index;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
