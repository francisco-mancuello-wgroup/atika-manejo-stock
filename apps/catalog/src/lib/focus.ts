/** Where a photo stays visible when a frame crops it, in percent (50 is the center). */
export interface Focus {
  focusX: number;
  focusY: number;
}

const CENTER = 50;

const clamp = (value: number | undefined): number =>
  Math.min(100, Math.max(0, Math.round(value ?? CENTER)));

/** The stored point, or the center when the photo has none. */
export function focusOf(image: Partial<Focus>): Focus {
  return { focusX: clamp(image.focusX), focusY: clamp(image.focusY) };
}

/** CSS `object-position` that keeps the focal point inside an `object-cover` frame. */
export function objectPosition(focus: Partial<Focus>): string {
  const { focusX, focusY } = focusOf(focus);
  return `${focusX}% ${focusY}%`;
}
