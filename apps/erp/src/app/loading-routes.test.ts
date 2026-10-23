import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const erpDir = join(import.meta.dirname, "(erp)");

function pageDirs(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) return [];
      return pageDirs(full);
    })
    .concat(readdirSync(dir).includes("page.tsx") ? [dir] : []);
}

/** Pages that only redirect, so they never render anything to show a skeleton for. */
const redirectOnly = new Set(["promos", "promos/bancos/nueva"]);

describe("ERP loading states", () => {
  it("gives every rendering ERP page its own loading.tsx", () => {
    const missing = pageDirs(erpDir)
      .map((dir) => relative(erpDir, dir))
      .filter(
        (dir) => !redirectOnly.has(dir) && !readdirSync(join(erpDir, dir)).includes("loading.tsx"),
      );
    expect(missing).toEqual([]);
  });
});
