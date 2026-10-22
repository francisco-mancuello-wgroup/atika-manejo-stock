import Link from "next/link";
import { GROUPS_LIST_HREF } from "../lib/catalog-groups/workspace";
import type { GroupDetail, GroupOptions } from "../lib/queries/catalog-groups";
import type { PickerProduct } from "../lib/queries/discounts";
import { GroupEditor, type GroupEditorActions } from "./group-editor";
import { PageHeader } from "./page-header";

/** A publication group on its own page: the group to edit, or none to create one. */
export function GroupPage({
  detail,
  options,
  products,
  actions,
}: {
  detail: GroupDetail | null;
  options: GroupOptions;
  products: PickerProduct[];
  actions: GroupEditorActions;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={GROUPS_LIST_HREF}
        className="w-fit text-sm text-muted underline-offset-4 hover:underline"
      >
        ← Grupos
      </Link>
      <PageHeader
        title={detail ? detail.name : "Nuevo grupo"}
        description="Elegí las prendas y cuántas unidades por talle puede vender la web."
      />
      <GroupEditor
        key={detail?.id ?? "new"}
        detail={detail}
        options={options}
        products={products}
        actions={actions}
        backHref={GROUPS_LIST_HREF}
      />
    </div>
  );
}
