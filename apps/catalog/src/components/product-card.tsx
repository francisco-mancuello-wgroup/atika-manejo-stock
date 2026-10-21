import Link from "next/link";
import type { CatalogProduct } from "../lib/catalog-view";
import { formatGs } from "../lib/format";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const available = product.sizes.filter((size) => size.available).map((size) => size.size);
  return (
    <Link href={`/producto/${product.id}`} className="group flex flex-col gap-3">
      {/* Photo placeholder: sand surface with an offset block until real photos exist. */}
      <div className="relative aspect-[3/4] bg-sand">
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-4 size-1/3 bg-subtle transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
        />
      </div>
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
