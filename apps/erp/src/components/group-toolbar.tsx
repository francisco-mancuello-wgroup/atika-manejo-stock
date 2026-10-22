import { Button, cn, Input } from "@atika/ui";
import type { RowFilter } from "../lib/catalog-groups/matrix";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active
          ? "border-ink bg-ink text-surface"
          : "border-line bg-surface text-ink hover:bg-subtle",
      )}
    >
      {children}
    </button>
  );
}

/** Search, filter chips and the bulk actions above the matrix. */
export function GroupToolbar({
  query,
  onQuery,
  filter,
  onFilter,
  total,
  soldOut,
  onAssignAll,
  onAdd,
}: {
  query: string;
  onQuery: (value: string) => void;
  filter: RowFilter;
  onFilter: (value: RowFilter) => void;
  total: number;
  soldOut: number;
  onAssignAll: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Buscar en el grupo"
          placeholder="Buscar en el grupo"
          className="w-64"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <div className="flex gap-2">
          <Chip active={filter === "todas"} onClick={() => onFilter("todas")}>
            {`Todas · ${total}`}
          </Chip>
          <Chip active={filter === "libre"} onClick={() => onFilter("libre")}>
            Con stock libre
          </Chip>
          <Chip active={filter === "agotadas"} onClick={() => onFilter("agotadas")}>
            {`Agotadas en web · ${soldOut}`}
          </Chip>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onAssignAll}>
          Asignar todo el libre
        </Button>
        {onAdd ? (
          <Button type="button" onClick={onAdd}>
            Agregar prendas
          </Button>
        ) : null}
      </div>
    </div>
  );
}
