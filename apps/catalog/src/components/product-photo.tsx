import Image from "next/image";

interface ProductPhotoProps {
  /** Cover photo URL, or null for the placeholder. */
  src: string | null;
  alt: string;
  /** `sizes` hint so the browser downloads a width that matches the layout. */
  sizes: string;
  /** Card (small offset on mobile, 10px on desktop) or page (large) offset. */
  size?: "card" | "page";
  priority?: boolean;
}

const OFFSETS = {
  card: "shadow-[6px_6px_0_0_var(--color-sand)] md:shadow-[10px_10px_0_0_var(--color-sand)]",
  page: "shadow-[12px_12px_0_0_var(--color-sand)]",
} as const;

/**
 * Product photo at 3:4 with a hard sand block offset behind it (no blur). Without a photo the
 * same box is filled with the subtle surface and nothing inside.
 */
export function ProductPhoto({ src, alt, sizes, size = "card", priority }: ProductPhotoProps) {
  const frame = `relative aspect-[3/4] ${OFFSETS[size]}`;
  if (src === null) {
    return <div className={`${frame} bg-subtle`} />;
  }
  return (
    <div className={frame}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
