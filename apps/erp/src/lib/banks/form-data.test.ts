// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readLogoFields } from "./form-data";

describe("readLogoFields", () => {
  it("ignores an untouched file input", async () => {
    const formData = new FormData();
    formData.set("logo", new File([], ""));
    expect(await readLogoFields(formData)).toEqual({ logo: null, removeLogo: false });
  });

  it("reads the chosen file and the remove checkbox", async () => {
    const formData = new FormData();
    formData.set("logo", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    formData.set("removeLogo", "on");
    const { logo, removeLogo } = await readLogoFields(formData);
    expect(logo?.type).toBe("image/png");
    expect([...(logo?.bytes ?? [])]).toEqual([1, 2, 3]);
    expect(removeLogo).toBe(true);
  });

  it("returns nothing when the form has no logo fields", async () => {
    expect(await readLogoFields(new FormData())).toEqual({ logo: null, removeLogo: false });
  });
});
