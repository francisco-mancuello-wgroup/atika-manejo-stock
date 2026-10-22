"use client";

import { promoHeadline } from "@atika/pricing";
import { buttonVariants, cn, Input } from "@atika/ui";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { FormState } from "../lib/action-state";
import type { PromoStatus } from "../lib/bank-promos/format";
import {
  matchesSearch,
  nextIdAfterDelete,
  promoRow,
  type WorkspaceSelection,
  type WorkspaceTab,
  workspaceHref,
} from "../lib/bank-promos/workspace";
import type { BankPromoDetail, BankPromoSummary, LotOption } from "../lib/queries/bank-promos";
import type { BankSummary } from "../lib/queries/banks";
import type { PickerProduct } from "../lib/queries/discounts";
import { BankForm } from "./bank-form";
import { BankLogo } from "./bank-logo";
import { BankPromoForm, type BankPromoFormInitial } from "./bank-promo-form";
import { segmentClass, segmentedClass } from "./segmented";

export type { WorkspaceSelection };

type SaveAction = (
  id: string | null,
  previous: FormState,
  formData: FormData,
) => Promise<FormState>;
type RemoveAction = (id: string) => Promise<FormState>;

export interface BankPromosWorkspaceActions {
  /** `promoId` is null when creating. */
  savePromo: SaveAction;
  removePromo: RemoveAction;
  /** `bankId` is null when creating. */
  saveBank: SaveAction;
  removeBank: RemoveAction;
}

const STATUS_STYLE: Record<PromoStatus, string> = {
  Vigente: "bg-subtle text-ok",
  Programada: "bg-subtle text-ink",
  Vencida: "bg-subtle text-muted",
  Inactiva: "bg-subtle text-muted",
};

const TABS: readonly [WorkspaceTab, string][] = [
  ["promos", "Promociones"],
  ["bancos", "Bancos"],
];

function initialOf(promo: BankPromoDetail): BankPromoFormInitial {
  return {
    kind: promo.kind,
    value: String(promo.value),
    capGs: promo.capGs === null ? "" : String(promo.capGs),
    startsAt: promo.startsAt ?? "",
    endsAt: promo.endsAt ?? "",
    terms: promo.terms ?? "",
    isActive: promo.isActive,
    scope: promo.scope,
    bankIds: promo.bankIds,
    days: promo.days,
    lotIds: promo.lotIds,
    productIds: promo.productIds,
  };
}

function ListItem({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <li className="border-b border-line">
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "flex flex-col gap-1 border-l-[3px] px-6 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
          selected ? "border-ink bg-subtle" : "border-transparent hover:bg-subtle",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function EmptyPane({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/**
 * Master-detail screen of the bank promos: promos or banks on the left, the selected one editable
 * on the right. The selection lives in the URL (links), the search only filters the left list.
 */
export function BankPromosWorkspace({
  selection,
  promos,
  banks,
  lots,
  products,
  selectedPromo,
  today,
  actions,
}: {
  selection: WorkspaceSelection;
  promos: BankPromoSummary[];
  banks: BankSummary[];
  lots: LotOption[];
  products: PickerProduct[];
  /** Saved values of the selected promo (null when creating or when there is none). */
  selectedPromo: BankPromoDetail | null;
  /** Asunción calendar day (`yyyy-mm-dd`), to tell current promos from scheduled and expired ones. */
  today: string;
  actions: BankPromosWorkspaceActions;
}) {
  const [query, setQuery] = useState("");
  const { tab } = selection;
  const onBanks = tab === "bancos";

  const promoRows = promos
    .map((promo) => ({ promo, row: promoRow(promo, today) }))
    .filter(({ row }) => matchesSearch(query, [row.searchText]));
  const visibleBanks = banks.filter((bank) => matchesSearch(query, [bank.name]));
  const noResults = onBanks ? visibleBanks.length === 0 : promoRows.length === 0;
  const hasItems = onBanks ? banks.length > 0 : promos.length > 0;

  const selectedBank = onBanks ? (banks.find((bank) => bank.id === selection.id) ?? null) : null;

  const afterDelete = (ids: readonly string[], id: string) =>
    workspaceHref({ tab, id: nextIdAfterDelete(ids, id) });

  return (
    <div className="flex min-h-[calc(100vh-9rem)] border border-line bg-bg">
      <aside className="flex w-[400px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex flex-col gap-4 border-b border-line px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-3xl text-ink">Bancos</h1>
            <Link
              href={workspaceHref({ tab, isNew: true })}
              className={buttonVariants({ size: "sm" })}
            >
              <span aria-hidden="true">+</span>
              Nueva
            </Link>
          </div>
          <Input
            type="search"
            aria-label="Buscar por banco o beneficio"
            placeholder="Buscar por banco o beneficio"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <nav aria-label="Secciones" className={cn(segmentedClass, "w-full")}>
            {TABS.map(([value, label]) => (
              <Link
                key={value}
                href={workspaceHref({ tab: value })}
                aria-current={tab === value ? "page" : undefined}
                className={cn(segmentClass(tab === value), "flex-1")}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {noResults ? (
          hasItems ? (
            <p className="px-6 py-4 text-sm text-muted">Sin resultados.</p>
          ) : null
        ) : (
          <ul
            aria-label={onBanks ? "Bancos" : "Promociones"}
            className="flex flex-col overflow-y-auto"
          >
            {onBanks
              ? visibleBanks.map((bank) => (
                  <ListItem
                    key={bank.id}
                    href={workspaceHref({ tab, id: bank.id })}
                    selected={!selection.isNew && selection.id === bank.id}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <BankLogo name={bank.name} logoUrl={bank.logoUrl} />
                      <span className="text-sm text-muted">
                        {`${bank.promoCount} ${bank.promoCount === 1 ? "promo" : "promos"}`}
                      </span>
                    </span>
                  </ListItem>
                ))
              : promoRows.map(({ promo, row }) => (
                  <ListItem
                    key={promo.id}
                    href={workspaceHref({ tab, id: promo.id })}
                    selected={!selection.isNew && selection.id === promo.id}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{row.benefit}</span>
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 text-[11px] font-medium",
                          STATUS_STYLE[row.status],
                        )}
                      >
                        {row.status}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{row.detail}</span>
                  </ListItem>
                ))}
          </ul>
        )}
      </aside>

      <section className="min-w-0 flex-1 px-10 py-8">
        {onBanks ? (
          selection.isNew || selectedBank ? (
            <BankForm
              key={selectedBank?.id ?? "new"}
              bank={selection.isNew ? null : selectedBank}
              save={actions.saveBank}
              remove={{
                action: actions.removeBank,
                redirectTo: afterDelete(
                  banks.map((bank) => bank.id),
                  selectedBank?.id ?? "",
                ),
              }}
            />
          ) : (
            <EmptyPane>Todavía no hay bancos. Creá el primero con Nueva.</EmptyPane>
          )
        ) : selection.isNew || selectedPromo ? (
          <BankPromoForm
            key={selection.isNew ? "new" : selectedPromo?.id}
            promoId={selection.isNew ? null : (selectedPromo?.id ?? null)}
            savedHeadline={selection.isNew || !selectedPromo ? null : promoHeadline(selectedPromo)}
            banks={banks}
            lots={lots}
            products={products}
            initial={selection.isNew || !selectedPromo ? undefined : initialOf(selectedPromo)}
            action={actions.savePromo.bind(
              null,
              selection.isNew ? null : (selectedPromo?.id ?? null),
            )}
            remove={{
              action: actions.removePromo,
              redirectTo: afterDelete(
                promos.map((promo) => promo.id),
                selectedPromo?.id ?? "",
              ),
            }}
          />
        ) : (
          <EmptyPane>Todavía no hay promociones. Creá la primera con Nueva.</EmptyPane>
        )}
      </section>
    </div>
  );
}
