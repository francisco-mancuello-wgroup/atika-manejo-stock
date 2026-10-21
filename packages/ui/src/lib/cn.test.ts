import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names and skips falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("lets the last conflicting tailwind class win", () => {
    expect(cn("px-2 text-ink", "px-4")).toBe("text-ink px-4");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
