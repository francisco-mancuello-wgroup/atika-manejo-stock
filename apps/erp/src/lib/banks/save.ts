import { randomUUID } from "node:crypto";
import type { FormState } from "../action-state";
import type { TransactionRunner } from "../lots/save";
import { type PhotoUpload, prepareUpload } from "../products/photos";
import { isUploadedLogo, type LogoStorage } from "./logo-storage";
import { parseBank } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: FormState = { status: "error", message: "No se encontró el banco." };
const LOGO_ERROR = "Subí un logo JPG, PNG o WebP de hasta 10 MB.";
/** Logos are small marks: 400 px on the longest side is plenty for the catalog and the ERP. */
const LOGO_MAX_SIDE = 400;

export type SaveBankState = FormState | { status: "success"; message: string; bankId: string };

export interface SaveBankOptions {
  /** Logo chosen in the form; replaces the current one. */
  logo?: PhotoUpload | null;
  /** "Quitar logo" ticked (ignored when a new logo is chosen). */
  removeLogo?: boolean;
  /** Required whenever there is a logo to store or delete. */
  storage?: LogoStorage;
}

function needStorage(options: SaveBankOptions): LogoStorage {
  if (!options.storage) throw new Error("A LogoStorage is required to save or remove logos");
  return options.storage;
}

const cleanup = (storage: LogoStorage | undefined, urls: readonly (string | null)[]) =>
  Promise.allSettled(
    urls
      .filter((url): url is string => url !== null && isUploadedLogo(url))
      .map((url) => storage?.deleteBankLogo(url)),
  );

/** Creates (`bankId` null) or edits a bank; name is unique regardless of case. */
export async function saveBank(
  db: TransactionRunner,
  bankId: string | null,
  raw: Record<string, string>,
  options: SaveBankOptions = {},
): Promise<SaveBankState> {
  const parsed = parseBank(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      values: raw,
    };
  }
  if (bankId !== null && !UUID.test(bankId)) return { ...NOT_FOUND, values: raw } as FormState;

  let prepared: Uint8Array | null = null;
  if (options.logo) {
    const result = await prepareUpload(options.logo, LOGO_MAX_SIDE);
    if (!result.ok) {
      return {
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: { logo: LOGO_ERROR },
        values: raw,
      };
    }
    prepared = result.bytes;
  }

  const id = bankId ?? randomUUID();
  const newUrl = prepared
    ? await needStorage(options).saveBankLogo(id, `${randomUUID()}.webp`, prepared)
    : null;

  type Outcome = { previousUrl: string | null } | { error: SaveBankState };
  let outcome: Outcome;
  try {
    outcome = await db.$transaction(async (tx): Promise<Outcome> => {
      const taken = await tx.bank.findFirst({
        where: { name: { equals: parsed.data.name, mode: "insensitive" }, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return {
          error: {
            status: "error",
            message: "Revisá los campos marcados.",
            fieldErrors: { name: "Ya existe un banco con ese nombre." },
            values: raw,
          },
        };
      }
      if (bankId === null) {
        await tx.bank.create({ data: { id, name: parsed.data.name, logoUrl: newUrl } });
        return { previousUrl: null };
      }
      const current = await tx.bank.findUnique({ where: { id }, select: { logoUrl: true } });
      if (!current) return { error: { ...NOT_FOUND, values: raw } as FormState };
      const logoUrl = newUrl ?? (options.removeLogo ? null : current.logoUrl);
      await tx.bank.update({ where: { id }, data: { name: parsed.data.name, logoUrl } });
      return { previousUrl: logoUrl === current.logoUrl ? null : current.logoUrl };
    });
  } catch (error) {
    await cleanup(options.storage, [newUrl]);
    throw error;
  }

  if ("error" in outcome) {
    await cleanup(options.storage, [newUrl]);
    return outcome.error;
  }
  await cleanup(options.storage, [outcome.previousUrl]);
  return {
    status: "success",
    message: bankId === null ? "Banco creado." : "Banco guardado.",
    bankId: id,
  };
}

/** Deletes a bank and its logo; a bank used by promos is refused with the reason. */
export async function deleteBank(
  db: TransactionRunner,
  bankId: string,
  storage?: LogoStorage,
): Promise<FormState> {
  if (!UUID.test(bankId)) return NOT_FOUND;
  const outcome = await db.$transaction(async (tx) => {
    const bank = await tx.bank.findUnique({
      where: { id: bankId },
      select: { name: true, logoUrl: true, _count: { select: { promos: true } } },
    });
    if (!bank) return NOT_FOUND;
    const uses = bank._count.promos;
    if (uses > 0) {
      const usedBy = uses === 1 ? "lo usa 1 promoción" : `lo usan ${uses} promociones`;
      return {
        status: "error",
        message: `No se puede eliminar "${bank.name}": ${usedBy}. Quitalo de ellas primero.`,
      } satisfies FormState;
    }
    await tx.bank.delete({ where: { id: bankId } });
    return { status: "success", message: "Banco eliminado.", logoUrl: bank.logoUrl } as const;
  });
  if (outcome.status !== "success") return outcome;
  if ("logoUrl" in outcome) await cleanup(storage, [outcome.logoUrl]);
  return { status: "success", message: outcome.message };
}
