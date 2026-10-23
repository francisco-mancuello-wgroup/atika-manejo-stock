import Image from "next/image";
import { type Focus, objectPosition } from "../lib/focus";

interface ProductPhotoProps {
  /** Cover photo URL, or null for the placeholder. */
  src: string | null;
  alt: string;
  /** `sizes` hint so the browser downloads a width that matches the layout. */
  sizes: string;
  /** Offset of the sand block: list row (6px), detail sheet (8px) or product page (12px). */
  size?: "row" | "sheet" | "page";
  /** Focal point kept visible by the 3:4 crop; the center when omitted. */
  focus?: Partial<Focus>;
  priority?: boolean;
}

const OFFSETS = {
  row: "shadow-[6px_6px_0_0_var(--color-sand)]",
  sheet: "shadow-[8px_8px_0_0_var(--color-sand)]",
  page: "shadow-[12px_12px_0_0_var(--color-sand)]",
} as const;

/**
 * Product photo at 3:4 with a hard sand block offset behind it (no blur). Without a photo the
 * same box is filled with the subtle surface and nothing inside.
 */
export function ProductPhoto({
  src,
  alt,
  sizes,
  size = "row",
  focus,
  priority,
}: ProductPhotoProps) {
  const frame = `relative aspect-[3/4] ${OFFSETS[size]}`;
  if (src === null) {
    return <div className={`${frame} bg-subtle`} />;
  }
  return (
    <div className={frame}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: objectPosition(focus ?? {}) }}
      />
    </div>
  );
}
