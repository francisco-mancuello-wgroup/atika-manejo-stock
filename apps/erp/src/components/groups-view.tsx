import { buttonVariants, cn } from "@atika/ui";
import Link from "next/link";
import type { FormState } from "../lib/action-state";
import type { ProductFilter } from "../lib/catalog-groups/groups";
import { type GroupsSelection, groupsHref } from "../lib/catalog-groups/workspace";
import type { GroupDetail, GroupOptions, GroupSummary } from "../lib/queries/catalog-groups";
import type { PickerProduct } from "../lib/queries/discounts";
import { CatalogTabs } from "./catalog-tabs";
import { GroupEditor } from "./group-editor";
import { GroupSwitch } from "./group-switch";
import { PageHeader } from "./page-header";
import { table } from "./styles";

export interface GroupsViewActions {
  /** `groupId` is null when creating. */
  saveGroup: (
    groupId: string | null,
    previous: FormState,
    formData: FormData,
  ) => Promise<FormState>;
  setActive: (groupId: string, active: boolean) => Promise<FormState>;
  saveAllocations: (
    groupId: string,
    entries: { variantId: string; allocated: number }[],
  ) => Promise<FormState>;
  addProducts: (groupId: string, filter: ProductFilter) => Promise<FormState>;
  removeProduct: (groupId: string, productId: string) => Promise<FormState>;
  deleteGroup: (groupId: string) => Promise<FormState>;
}

/** Note next to the switch when it is on but the web isn't showing the group (out of its window). */
function offWindowNote(group: GroupSummary): string | null {
  if (group.status === "Programado") return `Programado · desde ${group.startsAt}`;
  if (group.status === "Vencido") return "Vencido";
  return null;
}

function windowLabel(group: GroupSummary): string {
  if (!group.startsAt && !group.endsAt) return "Sin fecha";
  return `${group.startsAt ?? "…"} – ${group.endsAt ?? "…"}`;
}

/**
 * Grupos tab of the web catalog: every publication group in a table and, next to it, the editor of
 * the selected one (or of a new one). The selection lives in the URL.
 */
export function GroupsView({
  groups,
  selection,
  detail,
  options,
  products,
  actions,
}: {
  groups: GroupSummary[];
  selection: GroupsSelection;
  /** Saved values of the selected group (null when creating or when there is none). */
  detail: GroupDetail | null;
  options: GroupOptions;
  products: PickerProduct[];
  actions: GroupsViewActions;
}) {
  const editing = selection.isNew || detail !== null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo web"
        description="Publicá conjuntos de prendas y decidí cuántas unidades por talle puede vender la web."
        actions={
          <Link href={groupsHref({ isNew: true })} className={buttonVariants({ size: "sm" })}>
            <span aria-hidden="true">+</span>
            Nuevo grupo
          </Link>
        }
      />
      <CatalogTabs active="grupos" />

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 self-stretch">
          {groups.length === 0 ? (
            <p className="text-sm text-muted">
              Todavía no hay grupos. Creá el primero con Nuevo grupo.
            </p>
          ) : (
            <div className={table.wrapper}>
              <table className={table.root}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Nombre</th>
                    <th className={`${table.th} ${table.num}`}>Prendas</th>
                    <th className={`${table.th} ${table.num}`}>Asignadas</th>
                    <th className={`${table.th} ${table.num}`}>Vendidas</th>
                    <th className={`${table.th} ${table.num}`}>Restantes</th>
                    <th className={table.th}>Vigencia</th>
                    <th className={table.th}>Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const selected = group.id === selection.groupId;
                    const note = offWindowNote(group);
                    return (
                      // The group link is stretched over the row, so clicking anywhere opens it.
                      <tr
                        key={group.id}
                        className={cn(
                          table.row,
                          "relative cursor-pointer hover:bg-subtle",
                          selected && "bg-subtle",
                        )}
                      >
                        <td className={cn(table.td, "font-medium")}>
                          <Link
                            href={groupsHref({ groupId: group.id })}
                            aria-current={selected ? "page" : undefined}
                            className="underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
                          >
                            {group.name}
                          </Link>
                        </td>
                        <td className={`${table.td} ${table.num}`}>{group.productCount}</td>
                        <td className={`${table.td} ${table.num}`}>{group.allocated}</td>
                        <td className={`${table.td} ${table.num}`}>{group.sold}</td>
                        <td className={`${table.td} ${table.num}`}>{group.remaining}</td>
                        <td className={cn(table.td, "text-muted")}>{windowLabel(group)}</td>
                        <td className={cn(table.td, "relative z-10")}>
                          <div className="flex items-center gap-2">
                            <GroupSwitch
                              groupId={group.id}
                              name={group.name}
                              isActive={group.isActive}
                              action={actions.setActive}
                            />
                            {note ? (
                              <span className="whitespace-nowrap bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted">
                                {note}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editing ? (
          <aside
            aria-label="Editor de grupo"
            className="w-full shrink-0 border border-line bg-surface p-5 xl:w-[520px]"
          >
            <GroupEditor
              key={detail?.id ?? "new"}
              detail={selection.isNew ? null : detail}
              options={options}
              products={products}
              actions={actions}
              closeHref="/catalogo-web?tab=grupos"
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
