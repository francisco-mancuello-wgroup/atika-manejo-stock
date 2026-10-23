import { describe, expect, it } from "vitest";
import { focusOf, objectPosition } from "./focus";

describe("focusOf", () => {
  it("defaults to the center when the point is missing", () => {
    expect(focusOf({})).toEqual({ focusX: 50, focusY: 50, fit: null });
  });

  it("keeps a stored point and clamps it into the photo", () => {
    expect(focusOf({ focusX: 20, focusY: 80 })).toEqual({ focusX: 20, focusY: 80, fit: null });
    expect(focusOf({ focusX: -5, focusY: 140 })).toEqual({
      focusX: 0,
      focusY: 100,
      fit: null,
    });
  });

  it("keeps a chosen zoom (0-100) and treats a missing one as automatic", () => {
    expect(focusOf({ fit: 35 }).fit).toBe(35);
    expect(focusOf({ fit: 0 }).fit).toBe(0);
    expect(focusOf({ fit: null }).fit).toBeNull();
    expect(focusOf({ fit: 250 }).fit).toBe(100);
    expect(focusOf({ fit: Number.NaN }).fit).toBeNull();
  });
});

describe("objectPosition", () => {
  it("is the CSS object-position of the point", () => {
    expect(objectPosition({ focusX: 50, focusY: 20 })).toBe("50% 20%");
    expect(objectPosition({})).toBe("50% 50%");
  });
});
