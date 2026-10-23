export interface FocalPoint {
  focusX: number;
  focusY: number;
}

const POINT = /^(\d{1,3}),(\d{1,3})$/;

/**
 * The `focus.<imageId>` fields of the product form, each "X,Y" in whole percent (0-100). Anything
 * malformed or outside the photo is ignored, so the stored point stays.
 */
export function parseFocusFields(raw: Record<string, string>): Record<string, FocalPoint> {
  const points: Record<string, FocalPoint> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("focus.")) continue;
    const match = POINT.exec(value);
    if (!match) continue;
    const focusX = Number(match[1]);
    const focusY = Number(match[2]);
    if (focusX > 100 || focusY > 100) continue;
    points[key.slice("focus.".length)] = { focusX, focusY };
  }
  return points;
}
