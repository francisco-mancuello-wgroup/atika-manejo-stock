import { Button } from "@atika/ui";
import type { DraftChange } from "../lib/catalog-groups/matrix";

/** Sticky bar with the unsaved quantity changes; it only exists while there are some. */
export function GroupSaveBar({
  changes,
  pending,
  error,
  onDiscard,
  onSave,
}: {
  changes: readonly DraftChange[];
  pending: boolean;
  error: string | null;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const [first] = changes;
  if (!first) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-ink text-surface">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-col gap-0.5 text-sm">
          <p>
            {`${changes.length} ${changes.length === 1 ? "cambio" : "cambios"} sin guardar · ${first.label}: ${first.from} → ${first.to}`}
          </p>
          {error ? (
            <p role="alert" className="text-warnbg">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="border-surface/40 bg-transparent text-surface hover:bg-surface/10"
            disabled={pending}
            onClick={onDiscard}
          >
            Descartar
          </Button>
          <Button
            type="button"
            className="bg-surface text-ink hover:bg-subtle"
            disabled={pending}
            onClick={onSave}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
