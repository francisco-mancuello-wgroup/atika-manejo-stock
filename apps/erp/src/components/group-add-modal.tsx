"use client";

import { Button, cn } from "@atika/ui";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "../lib/action-state";
import {
  CRITERIA,
  type Criterion,
  criterionFilter,
  criterionOptions,
  freeSizesLabel,
  isSelectable,
  proposedUnits,
  selectableIds,
} from "../lib/catalog-groups/candidates";
import type { ProductFilter } from "../lib/catalog-groups/groups";
import type { Proposal } from "../lib/catalog-groups/stock";
import type { GroupCandidate, GroupOptions } from "../lib/queries/catalog-groups";
import { Field, FormMessage, Select } from "./form-controls";
import { ProductThumb } from "./product-thumb";

const PROPOSALS: readonly [Proposal, string][] = [
  ["all", "Todo el libre"],
  ["one", "1 por talle"],
  ["zero", "0 (ajusto después)"],
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function CandidateRow({
  candidate,
  groupName,
  checked,
  onToggle,
}: {
  candidate: GroupCandidate;
  groupName: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const selectable = isSelectable(candidate);
  const note = candidate.inGroup
    ? `Ya está en ${groupName}`
    : selectable
      ? freeSizesLabel(candidate)
      : "Sin stock libre";
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-line px-4 py-2 last:border-b-0",
        !selectable && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        aria-label={`Seleccionar ${candidate.name}`}
        className="size-4 accent-ink"
        disabled={!selectable}
        checked={selectable && checked}
        onChange={onToggle}
      />
      <ProductThumb src={candidate.imageUrl} name={candidate.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{candidate.name}</span>
        <span className="truncate text-xs text-muted">{candidate.lotName}</span>
      </div>
      <span className="text-sm text-muted">{note}</span>
    </li>
  );
}

/** Dialog to add products to a group by lote, catálogo, categoría or marca, picking from the list. */
export function GroupAddModal({
  groupId,
  groupName,
  options,
  listCandidates,
  addProducts,
  onClose,
}: {
  groupId: string;
  groupName: string;
  options: GroupOptions;
  listCandidates: (groupId: string, filter: ProductFilter) => Promise<GroupCandidate[]>;
  addProducts: (groupId: string, filter: ProductFilter, proposal: Proposal) => Promise<FormState>;
  onClose: () => void;
}) {
  const [criterion, setCriterion] = useState<Criterion>("lote");
  const [value, setValue] = useState("");
  const [candidates, setCandidates] = useState<GroupCandidate[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [proposal, setProposal] = useState<Proposal>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headerRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("select")?.focus();
  }, []);

  useEffect(() => {
    if (value === "") {
      setCandidates([]);
      setSelected(new Set());
      return;
    }
    let stale = false;
    listCandidates(groupId, criterionFilter(criterion, value)).then((found) => {
      if (stale) return;
      setCandidates(found);
      setSelected(new Set(selectableIds(found)));
    });
    return () => {
      stale = true;
    };
  }, [criterion, value, groupId, listCandidates]);

  const selectable = selectableIds(candidates);
  const chosen = selectable.filter((id) => selected.has(id));
  const allChosen = selectable.length > 0 && chosen.length === selectable.length;
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = chosen.length > 0 && !allChosen;
    }
  }, [chosen.length, allChosen]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = () =>
    startTransition(async () => {
      const state = await addProducts(groupId, { productIds: chosen }, proposal);
      if (state.status === "error") {
        setError(state.message);
        return;
      }
      onClose();
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-add-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="flex max-h-full w-full max-w-2xl flex-col border border-line bg-bg shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <h2 id="group-add-title" className="font-display text-2xl text-ink">
            {`Agregar prendas a ${groupName}`}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="px-2 text-xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-6">
          <div role="tablist" aria-label="Agregar por" className="flex gap-2">
            {CRITERIA.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={criterion === key}
                onClick={() => {
                  setCriterion(key);
                  setValue("");
                }}
                className={cn(
                  "h-9 border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  criterion === key
                    ? "border-ink bg-ink text-surface"
                    : "border-line bg-surface text-ink hover:bg-subtle",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Field label="Valor" htmlFor="group-add-value">
            <Select
              id="group-add-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">Elegí…</option>
              {criterionOptions(criterion, options).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {candidates.length > 0 ? (
            <div className="flex min-h-0 flex-col border border-line bg-surface">
              <label className="flex items-center gap-3 border-b border-line bg-subtle px-4 py-2 text-sm font-medium text-ink">
                <input
                  ref={headerRef}
                  type="checkbox"
                  className="size-4 accent-ink"
                  disabled={selectable.length === 0}
                  checked={allChosen}
                  onChange={() => setSelected(new Set(allChosen ? [] : selectable))}
                />
                {`Seleccionar las ${selectable.length}`}
              </label>
              <ul className="max-h-80 overflow-y-auto">
                {candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    groupName={groupName}
                    checked={selected.has(candidate.id)}
                    onToggle={() => toggle(candidate.id)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {error ? <FormMessage state={{ status: "error", message: error }} /> : null}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line p-6">
          <div className="w-52">
            <Field label="Proponer" htmlFor="group-add-proposal">
              <Select
                id="group-add-proposal"
                value={proposal}
                onChange={(event) => setProposal(event.target.value as Proposal)}
              >
                {PROPOSALS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="button" disabled={pending || chosen.length === 0} onClick={submit}>
            {`Agregar ${plural(chosen.length, "prenda", "prendas")} · ${plural(
              proposedUnits(candidates, new Set(chosen), proposal),
              "unidad",
              "unidades",
            )}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
