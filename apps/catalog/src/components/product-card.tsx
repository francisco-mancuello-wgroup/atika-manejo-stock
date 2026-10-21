import Link from "next/link";
import type { CatalogProduct } from "../lib/catalog-view";
import { formatGs } from "../lib/format";
import { ProductPhoto } from "./product-photo";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const available = product.sizes.filter((size) => size.available).map((size) => size.size);
  return (
    <Link href={`/producto/${product.id}`} className="group flex flex-col gap-3">
      <ProductPhoto
        src={product.imageUrl}
        alt={product.name}
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
      />
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-xl leading-tight text-ink">{product.name}</h3>
        <p className="text-sm text-ink">
          {product.priceGs === null ? "Consultar precio" : formatGs(product.priceGs)}
        </p>
        <p className="text-xs text-muted">
          {available.length > 0 ? available.join(" · ") : "Sin stock"}
        </p>
      </div>
    </Link>
  );
}
