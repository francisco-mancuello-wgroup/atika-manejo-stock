import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "globals.css"), "utf8");

describe("theme tokens (Propuesta B)", () => {
  it.each([
    ["--color-bg", "#f4f1ec"],
    ["--color-surface", "#faf8f4"],
    ["--color-subtle", "#ebe6dd"],
    ["--color-line", "#d6cfc3"],
    ["--color-ink", "#141311"],
    ["--color-muted", "#6a645b"],
    ["--color-sand", "#d8c9b0"],
    ["--color-warn", "#9a4a1e"],
    ["--color-warnbg", "#efe0ce"],
    ["--color-ok", "#4a6b4f"],
    ["--color-wa", "#2f6b4a"],
  ])("defines %s as %s", (token, value) => {
    expect(css.toLowerCase()).toContain(`${token}: ${value};`);
  });

  it("maps the sans and display font families to next/font variables", () => {
    expect(css).toContain("--font-sans: var(--font-inter)");
    expect(css).toContain("--font-display: var(--font-cormorant)");
    expect(css).not.toContain("--font-logo");
  });
});
