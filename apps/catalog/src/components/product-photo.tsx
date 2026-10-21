import Image from "next/image";

interface ProductPhotoProps {
  /** Cover photo URL, or null for the placeholder. */
  src: string | null;
  alt: string;
  /** `sizes` hint so the browser downloads a width that matches the layout. */
  sizes: string;
  /** Card (small) or page (large) offset. */
  size?: "card" | "page";
  priority?: boolean;
}

/**
 * Product photo at 3:4 on a sand block pushed out from behind it. Without a photo the sand
 * surface carries a smaller offset block instead.
 */
export function ProductPhoto({ src, alt, sizes, size = "card", priority }: ProductPhotoProps) {
  if (src === null) {
    return (
      <div className="relative aspect-[3/4] bg-sand">
        <div
          aria-hidden="true"
          className={`absolute size-1/3 bg-subtle transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${size === "page" ? "bottom-6 left-6" : "bottom-4 left-4"}`}
        />
      </div>
    );
  }
  return (
    <div className="relative aspect-[3/4]">
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-sand transition-transform group-hover:translate-x-1 group-hover:translate-y-1 ${size === "page" ? "translate-x-3 translate-y-3" : "translate-x-2 translate-y-2"}`}
      />
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
