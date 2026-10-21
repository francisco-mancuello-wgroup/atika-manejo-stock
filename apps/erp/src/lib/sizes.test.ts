import { sortSizes } from "./sizes";

describe("sortSizes", () => {
  it("orders the known sizes from smallest to one-size", () => {
    expect(sortSizes(["U", "L", "M/L", "XL", "S", "XS/S", "M", "XS"])).toEqual([
      "XS",
      "XS/S",
      "S",
      "M",
      "M/L",
      "L",
      "XL",
      "U",
    ]);
  });

  it("keeps unknown sizes at the end in alphabetical order and does not mutate the input", () => {
    const input = ["ZZ", "M", "AA"];
    expect(sortSizes(input)).toEqual(["M", "AA", "ZZ"]);
    expect(input).toEqual(["ZZ", "M", "AA"]);
  });
});
