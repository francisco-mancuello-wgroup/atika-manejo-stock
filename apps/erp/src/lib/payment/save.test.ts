import { afterAll, describe, expect, it } from "vitest";
import { dbOver, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import { savePaymentDetails } from "./save";

const form = {
  holderName: "SZUT EAS",
  bank: "Basa",
  accountGs: "2155009507",
  accountUsd: "12155002091",
  ruc: "80132068-2",
};

describe.skipIf(!hasDatabase)("payment details (database)", () => {
  afterAll(disconnectTestDb);

  it("saves the bank details in the single row, and updates it later", async () => {
    await withRollback(async (tx) => {
      expect(await savePaymentDetails(dbOver(tx), form)).toMatchObject({ status: "success" });
      await savePaymentDetails(dbOver(tx), { ...form, bank: "Itaú" });
      const rows = await tx.paymentDetails.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 1, ...form, bank: "Itaú" });
    });
  });

  it("rejects invalid details without writing", async () => {
    await withRollback(async (tx) => {
      const before = await tx.paymentDetails.findUnique({ where: { id: 1 } });
      const state = await savePaymentDetails(dbOver(tx), { ...form, ruc: "" });
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { ruc: "Ingresá el RUC." },
        values: { ...form, ruc: "" },
      });
      expect(await tx.paymentDetails.findUnique({ where: { id: 1 } })).toEqual(before);
    });
  });
});
