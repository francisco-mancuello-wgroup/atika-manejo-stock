import Link from "next/link";
import { windowLabel } from "../lib/catalog-groups/format";
import { GROUPS_LIST_HREF } from "../lib/catalog-groups/workspace";
import type { GroupDetail, GroupOptions } from "../lib/queries/catalog-groups";
import type { GroupActions } from "./group-actions";
import { GroupDataCard } from "./group-side-cards";
import { GroupStatusPill } from "./group-status-pill";
import { GroupSwitch } from "./group-switch";
import { GroupWorkspace } from "./group-workspace";

function Breadcrumb({ current }: { current: string }) {
  const link = "underline-offset-4 hover:text-ink hover:underline";
  return (
    <nav aria-label="Ruta" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/catalogo-web" className={link}>
            Catálogo web
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={GROUPS_LIST_HREF} className={link}>
            Grupos
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/** A publication group on its own page: the group to edit, or none to create one. */
export function GroupPage({
  detail,
  options,
  actions,
}: {
  detail: GroupDetail | null;
  options: GroupOptions;
  actions: GroupActions;
}) {
  if (!detail) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb current="Nuevo grupo" />
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-4xl text-ink">Nuevo grupo</h1>
          <p className="text-sm text-muted">
            Poné nombre y fechas. Después elegís las prendas y las cantidades por talle.
          </p>
        </header>
        <div className="max-w-sm">
          <GroupDataCard detail={null} action={actions.saveGroup} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb current={detail.name} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-ink">{detail.name}</h1>
            <GroupStatusPill status={detail.status} startsAt={detail.startsAt} />
          </div>
          <p className="text-sm text-muted">{windowLabel(detail.startsAt, detail.endsAt)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink">
          <span>Publicado</span>
          <GroupSwitch
            groupId={detail.id}
            name={detail.name}
            isActive={detail.isActive}
            action={actions.setActive}
          />
        </div>
      </header>
      <GroupWorkspace key={detail.id} detail={detail} options={options} actions={actions} />
    </div>
  );
}
