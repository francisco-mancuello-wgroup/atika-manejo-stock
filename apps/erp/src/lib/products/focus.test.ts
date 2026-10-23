import { describe, expect, it } from "vitest";
import { parseFocusFields } from "./focus";

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
