import { describe, expect, it } from "vitest";
import { autoFit, frameLayout } from "./frame-layout";

const frame = { frameW: 400, frameH: 400 };
const center = { focusX: 50, focusY: 50 };

describe("frameLayout", () => {
  it("fit 100 fills the frame exactly like object-cover + object-position", () => {
    // 3:2 landscape in a square: scaled to the frame height, cropped sideways around the focus
    const layout = frameLayout({
      ...frame,
      imageW: 600,
      imageH: 400,
      focusX: 25,
      focusY: 50,
      fit: 100,
    });
    expect(layout).toEqual({ width: 600, height: 400, left: -50, top: 0 });
    // portrait 2:3: scaled to the frame width, cropped vertically around the focus
    const portrait = frameLayout({
      ...frame,
      imageW: 400,
      imageH: 600,
      focusX: 50,
      focusY: 80,
      fit: 100,
    });
    expect(portrait).toEqual({ width: 400, height: 600, left: 0, top: -160 });
  });

  it("fit 0 shows the whole photo, centered, like object-fit contain", () => {
    expect(frameLayout({ ...frame, ...center, imageW: 600, imageH: 400, fit: 0 })).toEqual({
      width: 400,
      height: 400 * (400 / 600),
      left: 0,
      top: (400 - 400 * (400 / 600)) / 2,
    });
    expect(frameLayout({ ...frame, ...center, imageW: 400, imageH: 600, fit: 0 })).toEqual({
      width: 400 * (400 / 600),
      height: 400,
      left: (400 - 400 * (400 / 600)) / 2,
      top: 0,
    });
  });

  it("ignores the focal point on an axis where the whole photo is visible", () => {
    const layout = frameLayout({
      ...frame,
      imageW: 600,
      imageH: 400,
      focusX: 0,
      focusY: 0,
      fit: 0,
    });
    expect(layout.left).toBe(0);
    expect(layout.top).toBeCloseTo(66.67, 1);
  });

  it("blends the scale linearly between whole photo and fill", () => {
    const layout = frameLayout({ ...frame, ...center, imageW: 600, imageH: 400, fit: 50 });
    // sContain 0.6667, sCover 1 -> s 0.8333
    expect(layout.width).toBeCloseTo(500, 5);
    expect(layout.height).toBeCloseTo(333.33, 1);
    expect(layout.left).toBeCloseTo(-50, 5); // wider than the frame: focus decides
    expect(layout.top).toBeCloseTo(33.33, 1); // shorter: centered, no focus
  });

  it("never leaves a gap on an axis the photo covers", () => {
    for (const focus of [0, 33, 100]) {
      const l = frameLayout({
        ...frame,
        imageW: 600,
        imageH: 400,
        focusX: focus,
        focusY: focus,
        fit: 80,
      });
      expect(l.left).toBeLessThanOrEqual(0);
      expect(l.left + l.width).toBeGreaterThanOrEqual(400);
    }
  });

  it("a photo with the frame's shape is the same at any fit", () => {
    for (const fit of [0, 40, 100]) {
      expect(frameLayout({ ...frame, ...center, imageW: 800, imageH: 800, fit })).toEqual({
        width: 400,
        height: 400,
        left: 0,
        top: 0,
      });
    }
  });

  it("falls back to filling the frame when a size is unknown", () => {
    expect(frameLayout({ ...frame, ...center, imageW: 0, imageH: 0, fit: 0 })).toEqual({
      width: 400,
      height: 400,
      left: 0,
      top: 0,
    });
  });
});

describe("autoFit", () => {
  it("always keeps the whole height: narrower photos whole, wider ones crop only their sides", () => {
    // 3:4 frame
    expect(autoFit(400, 600, 300, 400)).toBe(0);
    expect(autoFit(300, 400, 300, 400)).toBe(0);
    expect(autoFit(400, 400, 300, 400)).toBe(100);
    expect(autoFit(600, 400, 300, 400)).toBe(100);
  });

  it("gives the photo the frame height in both cases", () => {
    for (const [imageW, imageH] of [
      [400, 600],
      [600, 400],
    ] as const) {
      const fit = autoFit(imageW, imageH, 300, 400);
      const layout = frameLayout({
        frameW: 300,
        frameH: 400,
        imageW,
        imageH,
        focusX: 50,
        focusY: 50,
        fit,
      });
      expect(layout.height).toBeCloseTo(400);
      expect(layout.top).toBeCloseTo(0);
    }
  });
});
