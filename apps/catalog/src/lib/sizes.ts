const SIZE_ORDER = ["XS", "XS/S", "S", "M", "M/L", "L", "XL", "U"];

/** Known sizes from smallest to one-size; unknown ones follow alphabetically. */
export function sortSizes(sizes: readonly string[]): string[] {
  const rank = (size: string) => {
    const index = SIZE_ORDER.indexOf(size);
    return index === -1 ? SIZE_ORDER.length : index;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
