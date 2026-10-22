import { afterAll, describe, expect, it } from "vitest";
import { disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { getBankList } from "./banks";

describe.skipIf(!hasDatabase)("bank queries (database)", () => {
  afterAll(disconnectTestDb);

  it("lists banks by name with their logo and how many promos use them", async () => {
    await withRollback(async (tx) => {
      const used = await tx.bank.create({
        data: { name: "Zeta query test", logoUrl: "/media/banks/z.webp" },
      });
      await tx.bank.create({ data: { name: "Alfa query test" } });
      await tx.bankPromo.create({
        data: { kind: "refund", value: 20, scope: "all", banks: { create: [{ bankId: used.id }] } },
      });
      const mine = (await getBankList(tx)).filter((bank) => bank.name.endsWith("query test"));
      expect(mine).toEqual([
        { id: expect.any(String), name: "Alfa query test", logoUrl: null, promoCount: 0 },
        { id: used.id, name: "Zeta query test", logoUrl: "/media/banks/z.webp", promoCount: 1 },
      ]);
    });
  });
});
