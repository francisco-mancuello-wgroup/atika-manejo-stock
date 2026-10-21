// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readPhotoFields } from "./form-data";

describe("readPhotoFields", () => {
  it("collects non-empty photos and the ids to remove, ignoring empty file inputs", async () => {
    const formData = new FormData();
    formData.append(
      "photos",
      new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }),
    );
    formData.append("photos", new File([], "", { type: "application/octet-stream" }));
    formData.append("removePhoto", "img-1");
    formData.append("removePhoto", "img-2");
    const result = await readPhotoFields(formData);
    expect(result.removePhotoIds).toEqual(["img-1", "img-2"]);
    expect(result.uploads).toHaveLength(1);
    expect(result.uploads[0]?.type).toBe("image/png");
    expect([...(result.uploads[0]?.bytes ?? [])]).toEqual([1, 2, 3]);
  });

  it("returns empty lists when nothing was sent", async () => {
    expect(await readPhotoFields(new FormData())).toEqual({ uploads: [], removePhotoIds: [] });
  });
});
