"use client";

import { Button } from "@atika/ui";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { type FormState, IDLE } from "../lib/action-state";
import type { BrandRow } from "../lib/brands/save";
import { shrinkInputPhotos, tooBigToUpload } from "../lib/products/shrink-photos";

const iconButton =
  "inline-flex size-8 items-center justify-center border border-line bg-surface text-sm text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40";

/** Up and down arrows of a brand; a refusal shows next to them. */
export function BrandOrderButtons({
  brand,
  canMoveUp,
  canMoveDown,
  move,
}: {
  brand: Pick<BrandRow, "id" | "name">;
  canMoveUp: boolean;
  canMoveDown: boolean;
  move: (brandId: string, direction: "up" | "down") => Promise<FormState>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (direction: "up" | "down") =>
    startTransition(async () => {
      const state = await move(brand.id, direction);
      setError(state.status === "error" ? state.message : null);
    });
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          className={iconButton}
          aria-label={`Subir ${brand.name}`}
          disabled={!canMoveUp || pending}
          onClick={() => run("up")}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label={`Bajar ${brand.name}`}
          disabled={!canMoveDown || pending}
          onClick={() => run("down")}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
      {error ? (
        <span role="alert" className="max-w-40 text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The cover of a brand: a thumbnail, a file input (the photo is shrunk in the browser first, like
 * every upload) and "Quitar portada" while an uploaded one is set.
 */
export function BrandCoverControl({
  brand,
  saveCover,
  removeCover,
}: {
  brand: Pick<BrandRow, "id" | "name" | "coverUrl">;
  saveCover: (brandId: string, previous: FormState, formData: FormData) => Promise<FormState>;
  removeCover: (brandId: string) => Promise<FormState>;
}) {
  const [state, formAction, saving] = useActionState(saveCover.bind(null, brand.id), IDLE);
  const [removeState, setRemoveState] = useState<FormState>(IDLE);
  const [removing, startRemoving] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();
  const pick = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (chosen) URL.revokeObjectURL(chosen);
    };
  }, [chosen]);

  // After a successful save the chosen file is the saved cover: clear the input
  useEffect(() => {
    if (state.status !== "success") return;
    setChosen(null);
    if (input.current) input.current.value = "";
  }, [state]);

  const shown = chosen ?? brand.coverUrl;
  const message = fileError
    ? ({ status: "error", message: fileError } as const)
    : removeState.status !== "idle"
      ? removeState
      : state;

  return (
    <form action={formAction} className="flex items-center gap-3">
      <div className="relative h-16 w-12 shrink-0 overflow-hidden border border-line bg-subtle">
        {shown ? (
          <Image
            src={shown}
            alt=""
            fill
            sizes="48px"
            unoptimized={chosen !== null}
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <input
          ref={input}
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Portada de ${brand.name}`}
          className="w-44 text-xs"
          onChange={async (event) => {
            const target = event.target;
            const file = target.files?.[0];
            setChosen(
              file && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null,
            );
            setRemoveState(IDLE);
            const current = ++pick.current;
            setPreparing(true);
            const files = await shrinkInputPhotos(target, () => current === pick.current);
            if (current !== pick.current) return;
            setFileError(
              tooBigToUpload(files.map((photo) => photo.size))
                ? "La foto pesa demasiado: probá con una más liviana."
                : undefined,
            );
            setPreparing(false);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            aria-label={`Guardar portada de ${brand.name}`}
            disabled={saving || preparing || chosen === null || fileError !== undefined}
          >
            {saving ? "Guardando…" : "Guardar portada"}
          </Button>
          {brand.coverUrl ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={`Quitar portada de ${brand.name}`}
              disabled={removing}
              onClick={() =>
                startRemoving(async () => {
                  setRemoveState(await removeCover(brand.id));
                })
              }
            >
              Quitar portada
            </Button>
          ) : null}
        </div>
        {message.status !== "idle" ? (
          <span
            role={message.status === "error" ? "alert" : "status"}
            className={message.status === "error" ? "text-xs text-warn" : "text-xs text-ok"}
          >
            {message.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
