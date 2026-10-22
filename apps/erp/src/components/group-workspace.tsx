"use client";

import { useEffect, useState, useTransition } from "react";
import {
  assignAllFree,
  type Draft,
  draftChanges,
  filterRows,
  groupKpis,
  matrixSizes,
  type RowFilter,
  reconcileDraft,
  rowRemaining,
  savedDraft,
} from "../lib/catalog-groups/matrix";
import type { GroupDetail, GroupOptions } from "../lib/queries/catalog-groups";
import { FormMessage } from "./form-controls";
import type { GroupActions } from "./group-actions";
import { GroupAddModal } from "./group-add-modal";
import { GroupKpis } from "./group-kpis";
import { GroupMatrix } from "./group-matrix";
import { GroupSaveBar } from "./group-save-bar";
import { GroupDangerCard, GroupDataCard, GroupHelpCard } from "./group-side-cards";
import { GroupToolbar } from "./group-toolbar";

/**
 * Body of the group page: totals, the quantity matrix with its unsaved changes, and the side cards.
 * Quantities are kept as drafts until "Guardar cambios"; a server refresh keeps what is still unsaved.
 */
export function GroupWorkspace({
  detail,
  options,
  actions,
}: {
  detail: GroupDetail;
  options: GroupOptions;
  actions: GroupActions;
}) {
  const nextSaved = savedDraft(detail.products);
  const signature = JSON.stringify(nextSaved);
  const [saved, setSaved] = useState<Draft>(nextSaved);
  const [draft, setDraft] = useState<Draft>(nextSaved);
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setSaved(nextSaved);
    setDraft(reconcileDraft(saved, draft, nextSaved));
  }

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RowFilter>("todas");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const changes = draftChanges(detail.products, saved, draft);
  const dirty = changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const rows = filterRows(detail.products, draft, query, filter);
  const soldOut = detail.products.filter((product) => rowRemaining(product, draft) === 0).length;

  const save = () =>
    startTransition(async () => {
      const state = await actions.saveAllocations(
        detail.id,
        changes.map(({ variantId, to }) => ({ variantId, allocated: to })),
      );
      if (state.status === "error") {
        setSaveError(state.message);
        return;
      }
      setSaveError(null);
      const written = Object.fromEntries(
        changes.map(({ variantId, to }) => [variantId, String(to)]),
      );
      setSaved((current) => ({ ...current, ...written }));
      setDraft((current) => ({ ...current, ...written }));
    });

  return (
    <div className="flex flex-col gap-6 pb-20">
      <GroupKpis kpis={groupKpis(detail.products, saved)} />
      <GroupToolbar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        total={detail.products.length}
        soldOut={soldOut}
        onAssignAll={() => setDraft(assignAllFree(detail.products))}
        onAdd={() => setAdding(true)}
      />
      {removeError ? <FormMessage state={{ status: "error", message: removeError }} /> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-3">
          {detail.products.length === 0 ? (
            <p className="border border-line bg-surface p-6 text-sm text-muted">
              Todavía no agregaste prendas.
            </p>
          ) : (
            <GroupMatrix
              products={rows}
              sizes={matrixSizes(detail.products)}
              saved={saved}
              draft={draft}
              disabled={pending}
              onChange={(variantId, value) =>
                setDraft((current) => ({ ...current, [variantId]: value }))
              }
              onRemove={(product) =>
                startTransition(async () => {
                  const state = await actions.removeProduct(detail.id, product.id);
                  setRemoveError(state.status === "error" ? state.message : null);
                })
              }
            />
          )}
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>{`Mostrando ${rows.length} de ${detail.products.length} prendas`}</span>
            <span>Enter pasa al talle siguiente</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <GroupDataCard detail={detail} action={actions.saveGroup} />
          <GroupHelpCard />
          <GroupDangerCard detail={detail} action={actions.deleteGroup} />
        </div>
      </div>
      {adding ? (
        <GroupAddModal
          groupId={detail.id}
          groupName={detail.name}
          options={options}
          listCandidates={actions.listCandidates}
          addProducts={actions.addProducts}
          onClose={() => setAdding(false)}
        />
      ) : null}
      <GroupSaveBar
        changes={changes}
        pending={pending}
        error={saveError}
        onDiscard={() => {
          setDraft(saved);
          setSaveError(null);
        }}
        onSave={save}
      />
    </div>
  );
}
