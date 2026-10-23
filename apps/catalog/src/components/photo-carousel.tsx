"use client";

import { cn } from "@atika/ui";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FramedPhoto } from "./framed-photo";
import { CloseIcon } from "./icons";

interface Photo {
  url: string;
  alt: string;
  focusX?: number;
  focusY?: number;
  fit?: number | null;
}

/**
 * Photos of one piece: a horizontal CSS scroll-snap strip (swipe on touch, scroll or arrow keys
 * elsewhere) with dots, and a full-screen zoom in a native modal `<dialog>` (Escape closes it).
 */
export function PhotoCarousel({
  photos,
  name,
  priority = false,
  className,
}: {
  photos: Photo[];
  name: string;
  priority?: boolean;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (zoom !== null && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [zoom]);

  function onScroll() {
    const element = scroller.current;
    if (!element || element.clientWidth === 0) return;
    setCurrent(Math.round(element.scrollLeft / element.clientWidth));
  }

  function goTo(index: number) {
    const element = scroller.current;
    element?.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  }

  if (photos.length === 0) {
    return (
      <div role="img" aria-label={`${name}, sin foto`} className={cn("bg-surface", className)} />
    );
  }

  const zoomed = zoom === null ? null : photos[zoom];

  return (
    <div className={cn("relative bg-surface", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: a scroller cannot be a fieldset */}
      <div
        ref={scroller}
        role="group"
        aria-label={`Fotos de ${name}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable so the arrow keys scroll it
        tabIndex={0}
        onScroll={onScroll}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, index) => (
          <div key={photo.url} className="relative size-full shrink-0 snap-center">
            <button
              type="button"
              aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
              onClick={() => setZoom(index)}
              className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              {/* Every photo takes the same frame, framed by its focal point and zoom; the zoom shows it whole */}
              <FramedPhoto
                src={photo.url}
                alt={photo.alt}
                sizes="(min-width: 1024px) 55vw, 100vw"
                priority={priority && index === 0}
                focus={photo}
              />
            </button>
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
          {photos.map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              aria-label={`Ir a la foto ${index + 1}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => goTo(index)}
              className="pointer-events-auto flex size-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-ink"
            >
              <span
                className={cn("size-1.5 rounded-full", index === current ? "bg-ink" : "bg-ink/25")}
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a convenience, Escape closes the dialog natively */}
      <dialog
        ref={dialog}
        aria-label={zoom === null ? undefined : `${name}, foto ${zoom + 1}`}
        onClose={() => setZoom(null)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 size-full max-h-none max-w-none bg-bg/95 p-0 backdrop:bg-ink/60"
      >
        {zoomed ? (
          <div className="relative size-full">
            <Image
              src={zoomed.url}
              alt={zoomed.alt}
              fill
              sizes="100vw"
              className="object-contain p-4 sm:p-10"
            />
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => dialog.current?.close()}
              className="absolute top-4 right-4 flex size-11 items-center justify-center border border-line bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
