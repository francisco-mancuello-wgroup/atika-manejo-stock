import type { CatalogProduct } from "../lib/catalog-view";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay prendas publicadas.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
