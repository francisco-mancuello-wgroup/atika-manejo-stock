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

const WHOLE_PERCENT = /^\d{1,3}$/;

/**
 * The `fit.<imageId>` fields of the product form: the zoom of a photo in whole percent (0 shows the
 * whole photo, 100 fills the frame) or empty for automatic (`null`). Anything else, or a zoom
 * outside 0-100, is ignored, so the stored value stays.
 */
export function parseFitFields(raw: Record<string, string>): Record<string, number | null> {
  const zooms: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("fit.")) continue;
    if (value === "") {
      zooms[key.slice("fit.".length)] = null;
      continue;
    }
    if (!WHOLE_PERCENT.test(value) || Number(value) > 100) continue;
    zooms[key.slice("fit.".length)] = Number(value);
  }
  return zooms;
}
