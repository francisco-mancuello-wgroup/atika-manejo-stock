import type { SellableProduct } from "../queries/sales";

/** Lowercase without accents, so "calida" finds "Cálida". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchText(product: SellableProduct): string {
  return normalize(
    [product.name, product.catalogName, product.color, product.code, product.brand, product.lotName]
      .filter(Boolean)
      .join(" "),
  );
}

/** Every word of the query must appear somewhere in the product's searchable fields. */
export function matchesProduct(product: SellableProduct, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchText(product);
  return words.every((word) => haystack.includes(word));
}

/** The product and size whose barcode is exactly `text` (trimmed, case-insensitive). */
export function findBySizeBarcode(
  products: readonly SellableProduct[],
  text: string,
): { product: SellableProduct; size: string } | null {
  const code = text.trim().toUpperCase();
  if (code === "") return null;
  for (const product of products) {
    const match = product.sizes.find((size) => size.barcode.toUpperCase() === code);
    if (match) return { product, size: match.size };
  }
  return null;
}
