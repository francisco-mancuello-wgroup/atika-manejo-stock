"use client";

import { autoFit, frameLayout } from "@atika/ui";
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react";

export interface FocusablePhoto {
  id: string;
  url: string;
  /** Percent (0-100, 50 = center); the center when missing. */
  focusX?: number;
  focusY?: number;
  /** Zoom in percent (0 = whole photo, 100 = fills the frame); null or missing = automatic. */
  fit?: number | null;
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
 * the photo, and how much of it shows with the zoom (whole photo ... fills the frame, or automatic:
 * landscape photos whole, the rest fill), with a preview of the result on a phone and on a
 * desktop laid out by the same `frameLayout` as the web. The point travels in a hidden
 * `focus.<id>` field as "X,Y" percent and the zoom in `fit.<id>` as a whole percent (empty =
 * automatic).
 */
export function FocalPointPicker({ photo, index }: { photo: FocusablePhoto; index: number }) {
  const [x, setX] = useState(clamp(photo.focusX ?? 50));
  const [y, setY] = useState(clamp(photo.focusY ?? 50));
  const [fit, setFit] = useState<number | null>(
    photo.fit === null || photo.fit === undefined ? null : clamp(photo.fit),
  );
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const source = useRef<HTMLImageElement>(null);
  const zoomId = useId();

  const readSize = (image: HTMLImageElement | null) => {
    if (image?.naturalWidth && image.naturalHeight) {
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    }
  };
  // The photo may have loaded before React attached `onLoad`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once on mount
  useEffect(() => {
    if (source.current?.complete) readSize(source.current);
  }, []);

  // What the slider shows: the chosen zoom, or the one automatic resolves to for this photo
  const effectiveFit = fit ?? (natural ? autoFit(natural.width, natural.height) : 100);

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

  const previews = [
    { label: "Celular", frame: "aspect-square w-14", ratio: { width: 100, height: 100 } },
    { label: "Escritorio", frame: "aspect-[5/6] w-12", ratio: { width: 100, height: 120 } },
  ];

  // Same math as the web, in percent of the frame (any frame size gives the same layout)
  const previewStyle = ({ width, height }: { width: number; height: number }) => {
    if (!natural) return { inset: 0, width: "100%", height: "100%", objectPosition: `${x}% ${y}%` };
    const layout = frameLayout({
      frameW: width,
      frameH: height,
      imageW: natural.width,
      imageH: natural.height,
      focusX: x,
      focusY: y,
      fit: effectiveFit,
    });
    return {
      left: `${(layout.left / width) * 100}%`,
      top: `${(layout.top / height) * 100}%`,
      width: `${(layout.width / width) * 100}%`,
      height: `${(layout.height / height) * 100}%`,
    };
  };

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
        <img
          ref={source}
          src={photo.url}
          alt=""
          onLoad={(event) => readSize(event.currentTarget)}
          className="block h-auto w-full"
        />
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
      <input type="hidden" name={`fit.${photo.id}`} value={fit ?? ""} />
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between text-xs">
          <label htmlFor={zoomId} className="text-ink">
            Zoom
          </label>
          <span className="text-muted">{effectiveFit}%</span>
        </div>
        <input
          id={zoomId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={effectiveFit}
          aria-label={`Zoom de la foto ${index + 1}`}
          onChange={(event) => setFit(clamp(Number(event.target.value)))}
          className="w-full accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        <div className="flex justify-between text-[10px] text-muted">
          <span>Completa</span>
          <span>Llenar</span>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={fit === null}
            onChange={(event) => setFit(event.target.checked ? null : effectiveFit)}
          />
          Automático
        </label>
        <p className="text-[10px] text-muted">Bajá el zoom para ver la foto completa en la web.</p>
      </div>
      <div className="flex items-end gap-3">
        {previews.map(({ label, frame, ratio }) => (
          <figure key={label} className="flex flex-col items-center gap-1">
            <div
              data-testid="crop-preview"
              className={`relative overflow-hidden bg-subtle ${frame}`}
            >
              {/* biome-ignore lint/performance/noImgElement: tiny preview of the same photo */}
              <img
                src={photo.url}
                alt=""
                className="absolute object-cover"
                style={previewStyle(ratio)}
              />
            </div>
            <figcaption className="text-[10px] text-muted">{label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
