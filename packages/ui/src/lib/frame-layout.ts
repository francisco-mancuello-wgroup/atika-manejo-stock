/** Size of the frame and of the photo, in any one unit (pixels), plus the zoom and focal point. */
export interface FrameLayoutInput {
  frameW: number;
  frameH: number;
  imageW: number;
  imageH: number;
  /** Focal point in percent (50 = center): the part kept inside the frame when the photo is cropped. */
  focusX: number;
  focusY: number;
  /** Zoom in percent: 0 shows the whole photo (contain), 100 fills the frame (cover). */
  fit: number;
}

/** Where to draw the photo inside the frame, in the same unit as the input. */
export interface FrameLayout {
  width: number;
  height: number;
  left: number;
  top: number;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** One axis: bigger than the frame -> offset by the focal point (like `object-position`, never a
 * gap); smaller -> centered, the bands around it are the frame background. */
function offset(frame: number, size: number, focus: number): number {
  return size >= frame ? ((frame - size) * clampPercent(focus)) / 100 : (frame - size) / 2;
}

/**
 * How a catalog photo sits in its fixed-size frame. The scale moves linearly with the zoom:
 * `s = sContain + fit/100 * (sCover - sContain)`, where `sContain = min(Fw/Iw, Fh/Ih)` shows the
 * whole photo and `sCover = max(Fw/Iw, Fh/Ih)` fills the frame. At 100 this is exactly
 * `object-fit: cover` + `object-position: focus%`; at 0 it is `object-fit: contain`, centered.
 * Shared by the catalog (real frames) and the ERP (previews) so both show the same crop.
 */
export function frameLayout({
  frameW,
  frameH,
  imageW,
  imageH,
  focusX,
  focusY,
  fit,
}: FrameLayoutInput): FrameLayout {
  if (!(imageW > 0 && imageH > 0 && frameW > 0 && frameH > 0)) {
    return { width: frameW, height: frameH, left: 0, top: 0 };
  }
  const contain = Math.min(frameW / imageW, frameH / imageH);
  const cover = Math.max(frameW / imageW, frameH / imageH);
  const scale = contain + (clampPercent(fit) / 100) * (cover - contain);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    width,
    height,
    left: offset(frameW, width, focusX),
    top: offset(frameH, height, focusY),
  };
}

/** The zoom of a photo without one, for a given frame: it always keeps the whole height. A photo
 * narrower than the frame is shown whole (bands at its sides); a wider one fills the frame and
 * loses only its sides. Either way the photo is exactly as tall as the frame. */
export function autoFit(imageW: number, imageH: number, frameW: number, frameH: number): number {
  return imageW * frameH <= frameW * imageH ? 0 : 100;
}
