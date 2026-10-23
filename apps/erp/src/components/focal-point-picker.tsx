"use client";

import { type KeyboardEvent, type MouseEvent, useState } from "react";

export interface FocusablePhoto {
  id: string;
  url: string;
  /** Percent (0-100, 50 = center); the center when missing. */
  focusX?: number;
  focusY?: number;
}

const STEP = 5;
const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, -STEP],
  ArrowDown: [0, STEP],
};

/**
 * Choose which part of one photo stays visible when the web crops it: click (or arrow keys) on
 * the photo, with a preview of the crop on a phone and on a desktop. The point travels in a
 * hidden `focus.<id>` field as "X,Y" percent.
 */
export function FocalPointPicker({ photo, index }: { photo: FocusablePhoto; index: number }) {
  const [x, setX] = useState(clamp(photo.focusX ?? 50));
  const [y, setY] = useState(clamp(photo.focusY ?? 50));

  const place = (nextX: number, nextY: number) => {
    setX(clamp(nextX));
    setY(clamp(nextY));
  };

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    place(
      ((event.clientX - box.left) / box.width) * 100,
      ((event.clientY - box.top) / box.height) * 100,
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const move = MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    place(x + move[0], y + move[1]);
  };

  const position = { objectPosition: `${x}% ${y}%` };
  const previews = [
    { label: "Celular", frame: "aspect-square w-14" },
    { label: "Escritorio", frame: "aspect-[5/6] w-12" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-label={`Punto de enfoque de la foto ${index + 1}: ${x}% horizontal, ${y}% vertical`}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="relative block w-full cursor-crosshair focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {/* biome-ignore lint/performance/noImgElement: the whole photo at its own ratio, so a click maps to a percent of it */}
        <img src={photo.url} alt="" className="block h-auto w-full" />
        <span
          data-marker
          aria-hidden="true"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink/60 shadow-[0_0_0_1px_var(--color-ink)]"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </button>
      <input type="hidden" name={`focus.${photo.id}`} value={`${x},${y}`} />
      <button
        type="button"
        onClick={() => place(50, 50)}
        className="self-start text-xs text-muted underline hover:text-ink"
      >
        Centrar
      </button>
      <div className="flex items-end gap-3">
        {previews.map(({ label, frame }) => (
          <figure key={label} className="flex flex-col items-center gap-1">
            <div
              data-testid="crop-preview"
              className={`relative overflow-hidden bg-subtle ${frame}`}
            >
              {/* biome-ignore lint/performance/noImgElement: tiny preview of the same photo */}
              <img src={photo.url} alt="" className="size-full object-cover" style={position} />
            </div>
            <figcaption className="text-[10px] text-muted">{label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
