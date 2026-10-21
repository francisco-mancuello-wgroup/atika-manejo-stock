import { afterAll, describe, expect, it } from "vitest";
import { disconnectTestDb, hasDatabase } from "../../test/db";
import { getDb } from "../db";
import { getCatalogProducts, getCatalogSettings } from "./catalog";

// Read-only checks against the local seeded database.
describe.skipIf(!hasDatabase)("catalog management queries (database)", () => {
  afterAll(async () => {
    await getDb().$disconnect();
    await disconnectTestDb();
  });

  it("lists products with available sizes only and filters by status and text", async () => {
    const all = await getCatalogProducts({ status: "todos" });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.sizes.every((s) => s.length > 0))).toBe(true);

    const soldOut = await getCatalogProducts({ status: "sin-stock" });
    expect(soldOut.every((p) => p.sizes.length === 0)).toBe(true);
    const visible = await getCatalogProducts({ status: "visibles" });
    const hidden = await getCatalogProducts({ status: "ocultos" });
    expect(visible.length + hidden.length).toBe(all.length);

    const first = all[0];
    const byText = await getCatalogProducts({ status: "todos", query: first?.name.slice(0, 4) });
    expect(byText.map((p) => p.id)).toContain(first?.id);
  });

  it("reads the catalog settings row", async () => {
    const settings = await getCatalogSettings();
    expect(settings.whatsappNumber.length).toBeGreaterThan(0);
    expect(typeof settings.showPrices).toBe("boolean");
  });
});
