import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

describe("self-hosted fonts", () => {
  it("ships the Jost and Bodoni Moda files inside the package", () => {
    expect(existsSync(here("./fonts/jost-latin.woff2"))).toBe(true);
    expect(existsSync(here("./fonts/bodoni-moda-latin.woff2"))).toBe(true);
  });

  it("loads them locally instead of from Google Fonts", () => {
    const source = readFileSync(here("./fonts.ts"), "utf8");
    expect(source).toContain('from "next/font/local"');
    expect(source).not.toContain("next/font/google");
    expect(source).toContain('variable: "--font-jost"');
    expect(source).toContain('variable: "--font-bodoni"');
  });
});
