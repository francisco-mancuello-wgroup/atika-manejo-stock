// @vitest-environment node
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { dbOver, disconnectTestDb, hasDatabase, withRollback } from "../../test/db";
import type { LogoStorage } from "./logo-storage";
import { deleteBank, saveBank } from "./save";

function memoryStorage() {
  const files = new Map<string, Uint8Array>();
  const storage: LogoStorage = {
    async saveBankLogo(bankId, fileName, bytes) {
      const url = `/media/banks/uploads/${bankId}/${fileName}`;
      files.set(url, bytes);
      return url;
    },
    async deleteBankLogo(url) {
      files.delete(url);
    },
  };
  return { files, storage };
}

const PNG = new Uint8Array(
  await sharp({
    create: { width: 20, height: 10, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer(),
);
const logo = { type: "image/png", bytes: PNG };

describe.skipIf(!hasDatabase)("bank management (database)", () => {
  afterAll(disconnectTestDb);

  it("creates a bank with its logo", async () => {
    await withRollback(async (tx) => {
      const { files, storage } = memoryStorage();
      const state = await saveBank(dbOver(tx), null, { name: " Banco nuevo " }, { logo, storage });
      expect(state).toMatchObject({ status: "success", bankId: expect.any(String) });
      const id = "bankId" in state ? state.bankId : "";
      const row = await tx.bank.findUniqueOrThrow({ where: { id } });
      expect(row.name).toBe("Banco nuevo");
      expect(row.logoUrl).toMatch(new RegExp(`^/media/banks/uploads/${id}/.+\\.webp$`));
      expect(files.has(row.logoUrl ?? "")).toBe(true);
    });
  });

  it("creates a bank without a logo", async () => {
    await withRollback(async (tx) => {
      const state = await saveBank(dbOver(tx), null, { name: "Sin logo" }, {});
      const id = "bankId" in state ? state.bankId : "";
      expect((await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl).toBeNull();
    });
  });

  it("replaces the logo on edit and deletes the previous file", async () => {
    await withRollback(async (tx) => {
      const { files, storage } = memoryStorage();
      const created = await saveBank(dbOver(tx), null, { name: "Cambia" }, { logo, storage });
      const id = "bankId" in created ? created.bankId : "";
      const first = (await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl ?? "";
      const edited = await saveBank(dbOver(tx), id, { name: "Cambió" }, { logo, storage });
      expect(edited).toMatchObject({ status: "success" });
      const row = await tx.bank.findUniqueOrThrow({ where: { id } });
      expect(row.name).toBe("Cambió");
      expect(row.logoUrl).not.toBe(first);
      expect(files.has(first)).toBe(false);
      expect(files.has(row.logoUrl ?? "")).toBe(true);
    });
  });

  it("keeps the logo when editing without a new file, and removes it on request", async () => {
    await withRollback(async (tx) => {
      const { files, storage } = memoryStorage();
      const created = await saveBank(dbOver(tx), null, { name: "Logo fijo" }, { logo, storage });
      const id = "bankId" in created ? created.bankId : "";
      const url = (await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl ?? "";

      await saveBank(dbOver(tx), id, { name: "Logo fijo 2" }, { storage });
      expect((await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl).toBe(url);

      await saveBank(dbOver(tx), id, { name: "Logo fijo 2" }, { removeLogo: true, storage });
      expect((await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl).toBeNull();
      expect(files.has(url)).toBe(false);
    });
  });

  it("rejects a duplicate name (case-insensitive) without writing", async () => {
    await withRollback(async (tx) => {
      await saveBank(dbOver(tx), null, { name: "Repetido" }, {});
      const before = await tx.bank.count();
      const state = await saveBank(dbOver(tx), null, { name: "repetido" }, {});
      expect(state).toMatchObject({
        status: "error",
        fieldErrors: { name: "Ya existe un banco con ese nombre." },
      });
      expect(await tx.bank.count()).toBe(before);
    });
  });

  it("allows saving a bank under its own name", async () => {
    await withRollback(async (tx) => {
      const created = await saveBank(dbOver(tx), null, { name: "Mismo" }, {});
      const id = "bankId" in created ? created.bankId : "";
      expect(await saveBank(dbOver(tx), id, { name: "Mismo" }, {})).toMatchObject({
        status: "success",
      });
    });
  });

  it("rejects an invalid logo and removes nothing", async () => {
    await withRollback(async (tx) => {
      const { storage } = memoryStorage();
      const before = await tx.bank.count();
      const state = await saveBank(
        dbOver(tx),
        null,
        { name: "Mal logo" },
        { logo: { type: "image/gif", bytes: PNG }, storage },
      );
      expect(state).toMatchObject({ status: "error", fieldErrors: { logo: expect.any(String) } });
      expect(await tx.bank.count()).toBe(before);
    });
  });

  it("reports a missing bank when editing one that does not exist", async () => {
    await withRollback(async (tx) => {
      const state = await saveBank(
        dbOver(tx),
        "0190f3a0-0000-7000-8000-00000000dead",
        { name: "X" },
        {},
      );
      expect(state).toMatchObject({ status: "error", message: "No se encontró el banco." });
    });
  });

  it("deletes an unused bank and its logo", async () => {
    await withRollback(async (tx) => {
      const { files, storage } = memoryStorage();
      const created = await saveBank(dbOver(tx), null, { name: "Borrable" }, { logo, storage });
      const id = "bankId" in created ? created.bankId : "";
      const url = (await tx.bank.findUniqueOrThrow({ where: { id } })).logoUrl ?? "";
      expect(await deleteBank(dbOver(tx), id, storage)).toMatchObject({ status: "success" });
      expect(await tx.bank.findUnique({ where: { id } })).toBeNull();
      expect(files.has(url)).toBe(false);
      expect(await deleteBank(dbOver(tx), id, storage)).toMatchObject({ status: "error" });
    });
  });

  it("refuses to delete a bank used by promos, with a clear message", async () => {
    await withRollback(async (tx) => {
      const created = await saveBank(dbOver(tx), null, { name: "En uso" }, {});
      const id = "bankId" in created ? created.bankId : "";
      for (const value of [6, 12]) {
        await tx.bankPromo.create({
          data: {
            kind: "installments",
            value,
            scope: "all",
            banks: { create: [{ bankId: id }] },
          },
        });
      }
      const state = await deleteBank(dbOver(tx), id, memoryStorage().storage);
      expect(state).toEqual({
        status: "error",
        message: 'No se puede eliminar "En uso": lo usan 2 promociones. Quitalo de ellas primero.',
      });
      expect(await tx.bank.findUnique({ where: { id } })).not.toBeNull();
    });
  });
});
