import { describe, expect, it } from "vitest";
import { parseFitFields, parseFocusFields } from "./focus";

describe("parseFocusFields", () => {
  it("reads every focus.<imageId> field as an integer point", () => {
    expect(parseFocusFields({ name: "x", "focus.a": "20,80", "focus.b": "0,100" })).toEqual({
      a: { focusX: 20, focusY: 80 },
      b: { focusX: 0, focusY: 100 },
    });
  });

  it("ignores malformed values and points outside the photo", () => {
    expect(
      parseFocusFields({
        "focus.a": "101,10",
        "focus.b": "10",
        "focus.c": "a,b",
        "focus.d": "10.5,20",
        "focus.e": "-1,20",
        "focus.f": "",
      }),
    ).toEqual({});
  });
});

describe("parseFitFields", () => {
  it("reads fit.<imageId> as a whole percent, or null when automatic (empty)", () => {
    expect(
      parseFitFields({ name: "x", "fit.a": "0", "fit.b": "100", "fit.c": "35", "fit.d": "" }),
    ).toEqual({
      a: 0,
      b: 100,
      c: 35,
      d: null,
    });
  });

  it("ignores malformed values and zooms outside 0-100", () => {
    expect(
      parseFitFields({
        "fit.a": "101",
        "fit.b": "-1",
        "fit.c": "10.5",
        "fit.d": "abc",
        "fit.e": " ",
      }),
    ).toEqual({});
  });
});
