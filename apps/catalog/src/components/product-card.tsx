import Link from "next/link";
import type { CatalogProduct } from "../lib/catalog-view";
import { formatGs } from "../lib/format";
import { ProductPhoto } from "./product-photo";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const available = product.sizes.filter((size) => size.available).map((size) => size.size);
  return (
    <Link href={`/producto/${product.id}`} className="group flex flex-col gap-2 md:gap-3">
      <ProductPhoto
        src={product.imageUrl}
        alt={product.name}
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
      />
      <div className="mt-2 flex flex-col gap-1 md:mt-1">
        {product.brand ? (
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{product.brand}</p>
        ) : null}
        <div className="flex flex-col justify-between gap-0.5 md:flex-row md:items-start md:gap-3">
          <h3 className="text-[13px] font-medium text-ink md:text-[15px]">{product.name}</h3>
          <p className="whitespace-nowrap text-[13px] text-ink md:text-[15px]">
            {product.priceGs === null ? "Consultar precio" : formatGs(product.priceGs)}
          </p>
        </div>
        <p className="text-[11px] text-muted md:text-xs">
          {available.length > 0 ? `Talles: ${available.join(" · ")}` : "Sin stock"}
        </p>
      </div>
    </Link>
  );
}
