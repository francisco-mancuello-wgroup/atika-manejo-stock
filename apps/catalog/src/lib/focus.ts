/**
 * How a photo sits in its frame: the point that stays visible when it is cropped, in percent (50
 * is the center), and the zoom in percent (0 = whole photo, 100 = fills the frame, null =
 * automatic: landscape photos whole, others fill).
 */
export interface Focus {
  focusX: number;
  focusY: number;
  fit?: number | null;
}

const CENTER = 50;

const clamp = (value: number | undefined): number =>
  Math.min(100, Math.max(0, Math.round(value ?? CENTER)));

/** The stored point, or the center when the photo has none; the zoom stays null when unset. */
export function focusOf(image: Partial<Focus>): Focus {
  const fit = image.fit;
  return {
    focusX: clamp(image.focusX),
    focusY: clamp(image.focusY),
    fit: fit === null || fit === undefined || Number.isNaN(fit) ? null : clamp(fit),
  };
}

/** CSS `object-position` that keeps the focal point inside an `object-cover` frame. */
export function objectPosition(focus: Partial<Focus>): string {
  const { focusX, focusY } = focusOf(focus);
  return `${focusX}% ${focusY}%`;
}
