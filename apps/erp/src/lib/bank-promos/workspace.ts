import {
  type BankPromoKind,
  type BankPromoRule,
  groupPromosForDisplay,
  type PromoGroup,
  promoHeadline,
} from "@atika/pricing";
import type { BankPromoSummary, LotOption, PromoBankRef } from "../queries/bank-promos";
import { type PromoStatus, promoStatus } from "./format";

export type WorkspaceTab = "promos" | "bancos";

/** What the master-detail screen shows on the right: an existing item, a blank form, or nothing. */
export interface WorkspaceSelection {
  tab: WorkspaceTab;
  id: string | null;
  isNew: boolean;
}

type Params = Record<string, string | string[] | undefined>;

const BASE = "/promos/bancos";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Reads the selection from the URL: `?promo=<id>` / `?nueva=1`, or `?tab=bancos&banco=<id>` /
 * `&nuevo=1`. Unknown ids fall back to the first item, so a stale link still shows something.
 */
export function parseSelection(
  params: Params,
  ids: { promoIds: readonly string[]; bankIds: readonly string[] },
): WorkspaceSelection {
  const banks = first(params.tab) === "bancos";
  const [available, wanted, fresh] = banks
    ? [ids.bankIds, first(params.banco), first(params.nuevo)]
    : [ids.promoIds, first(params.promo), first(params.nueva)];
  const tab: WorkspaceTab = banks ? "bancos" : "promos";
  if (fresh === "1") return { tab, id: null, isNew: true };
  const id = wanted && available.includes(wanted) ? wanted : (available[0] ?? null);
  return { tab, id, isNew: false };
}

/** URL of a selection; the inverse of `parseSelection`. */
export function workspaceHref(target: {
  tab: WorkspaceTab;
  id?: string | null;
  isNew?: boolean;
}): string {
  const query = new URLSearchParams();
  if (target.tab === "bancos") query.set("tab", "bancos");
  if (target.isNew) query.set(target.tab === "bancos" ? "nuevo" : "nueva", "1");
  else if (target.id) query.set(target.tab === "bancos" ? "banco" : "promo", target.id);
  const text = query.toString();
  return text ? `${BASE}?${text}` : BASE;
}

/** Item to select once `deletedId` is gone: the following one, else the previous one, else none. */
export function nextIdAfterDelete(ids: readonly string[], deletedId: string): string | null {
  const index = ids.indexOf(deletedId);
  const rest = ids.filter((id) => id !== deletedId);
  if (rest.length === 0) return null;
  return rest[Math.min(Math.max(index, 0), rest.length - 1)] ?? null;
}

/** Lowercase without accents, so "itau" finds "Itaú". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearch(query: string, texts: readonly string[]): boolean {
  const needle = normalizeText(query);
  return needle === "" || texts.some((text) => normalizeText(text).includes(needle));
}

export interface PromoRow {
  benefit: string;
  /** "Sudameris, BNF · Jueves · tope ₲ 200.000". */
  detail: string;
  status: PromoStatus;
  searchText: string;
}

/** One line of the promos list: the benefit on top, banks with days and cap below. */
export function promoRow(promo: BankPromoSummary, today: string): PromoRow {
  const headline = promoHeadline(promo);
  const benefit = promoHeadline({ ...promo, days: [], capGs: null });
  const extras = headline
    .slice(benefit.length)
    .split(" · ")
    .filter(Boolean)
    .map((part) => part.replace(/^Tope/, "tope"));
  const names = promo.banks.map((bank) => bank.name);
  return {
    benefit,
    detail: [names.join(", "), ...extras].join(" · "),
    status: promoStatus(promo, today),
    searchText: [headline, ...names].join(" "),
  };
}

/** The unsaved form values the preview is drawn from. */
export interface PromoDraft {
  kind: BankPromoKind;
  value: string;
  capGs: string;
  startsAt: string;
  endsAt: string;
  scope: "all" | "lots" | "products";
  bankIds: readonly string[];
  /** ISO weekdays; none = every day. */
  days: readonly number[];
  lotIds: readonly string[];
  /** How many products are picked (only read for the "products" scope). */
  productCount: number;
}

export interface PromoPreview {
  groups: PromoGroup[];
  /** Where and when it applies, as one sentence. */
  note: string;
}

const MAX_CAP_GS = 2_000_000_000;
const PLURAL_DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function shortDate(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function windowText(startsAt: string, endsAt: string): string {
  const start = ISO_DATE.test(startsAt) ? startsAt : "";
  const end = ISO_DATE.test(endsAt) ? endsAt : "";
  if (start && end) {
    const withYear = start.slice(0, 4) !== end.slice(0, 4);
    return ` del ${shortDate(start, withYear)} al ${shortDate(end, withYear)}`;
  }
  if (start) return ` desde el ${shortDate(start, false)}`;
  if (end) return ` hasta el ${shortDate(end, false)}`;
  return "";
}

function scopeText(draft: PromoDraft, lots: readonly LotOption[]): string {
  if (draft.scope === "all") return "En todos los productos";
  if (draft.scope === "lots") {
    const names = lots.filter((lot) => draft.lotIds.includes(lot.id)).map((lot) => lot.name);
    if (names.length === 0) return "Solo en prendas de los lotes elegidos";
    return names.length === 1
      ? `Solo en prendas del lote ${names[0]}`
      : `Solo en prendas de los lotes ${joinAnd(names)}`;
  }
  if (draft.productCount === 0) return "Solo en los productos elegidos";
  return `Solo en ${draft.productCount} ${draft.productCount === 1 ? "producto elegido" : "productos elegidos"}`;
}

function daysText(days: readonly number[]): string {
  const unique = [...new Set(days)].filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b);
  if (unique.length === 0 || unique.length === 7) return "todos los días";
  return `los ${joinAnd(unique.map((day) => PLURAL_DAYS[day - 1] as string))}`;
}

/**
 * What the customer would see for the values typed so far, drawn with the same pure helpers as the
 * catalog. Null while the benefit or the banks are incomplete or out of range.
 */
export function promoPreview(
  draft: PromoDraft,
  banks: readonly PromoBankRef[],
  lots: readonly LotOption[],
): PromoPreview | null {
  const valueText = draft.value.trim();
  if (!/^\d+$/.test(valueText)) return null;
  const value = Number(valueText);
  const [min, max] = draft.kind === "installments" ? [2, 48] : [1, 100];
  if (value < min || value > max) return null;

  const capText = draft.capGs.replace(/[.\s]/g, "");
  if (capText !== "" && !/^\d+$/.test(capText)) return null;
  const capGs = capText === "" ? null : Number(capText);
  if (capGs !== null && (capGs < 1 || capGs > MAX_CAP_GS)) return null;

  const chosen = banks.filter((bank) => draft.bankIds.includes(bank.id));
  if (chosen.length === 0) return null;

  const rule: BankPromoRule = {
    kind: draft.kind,
    value,
    days: draft.days,
    capGs,
    startsAt: null,
    endsAt: null,
    terms: null,
    isActive: true,
    scope: draft.scope,
    lotIds: [],
    productIds: [],
    banks: chosen,
  };
  return {
    groups: groupPromosForDisplay([rule]),
    note: `${scopeText(draft, lots)}, ${daysText(draft.days)}${windowText(draft.startsAt, draft.endsAt)}.`,
  };
}
