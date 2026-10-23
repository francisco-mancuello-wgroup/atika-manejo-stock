"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FramedPhoto } from "../framed-photo";
import { CloseIcon } from "./icons";

type Photo = {
  url: string;
  alt: string;
  pieceId?: string;
  focusX?: number;
  focusY?: number;
  fit?: number | null;
};

/**
 * The photos of a lookbook page: swipe sideways when there are several, tap one to see it full
 * screen, close with the X (or Escape). The native <dialog> handles focus and Escape.
 */
export function PiecePhotos({
  photos,
  label,
  priority,
}: {
  photos: Photo[];
  /** Accessible name of the photo list ("Fotos de Zamba Azul"). */
  label: string;
  /** Load the first photo eagerly (first pages of the catalog). */
  priority: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Photo | null>(null);

  const show = (photo: Photo) => {
    setOpen(photo);
    dialog.current?.showModal();
  };

  return (
    <>
      <ul
        aria-label={label}
        // Same portrait (3:4) frame on every page so the text below never shrinks it: as tall as
        // 60% of the screen, or the full width on narrow phones, centered. Side by side on wide
        // screens it fills the page height instead
        className="flex aspect-[3/4] h-[min(60svh,133vw)] max-w-full min-h-0 flex-none self-center snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-surface [scrollbar-width:none] landscape:lg:aspect-auto landscape:lg:h-auto landscape:lg:self-stretch"
      >
        {photos.map((photo, index) => (
          <li
            key={photo.url}
            // Choosing a color scrolls to the first photo of that product
            data-piece={
              photos.findIndex((p) => p.pieceId === photo.pieceId) === index
                ? photo.pieceId
                : undefined
            }
            className="relative h-full w-full shrink-0 snap-center"
          >
            <button
              type="button"
              onClick={() => show(photo)}
              aria-label={`Ver en grande: ${photo.alt}`}
              className="relative block size-full cursor-zoom-in"
            >
              {/* Every photo takes the same frame, framed by its focal point and zoom; the dialog below shows it whole */}
              <FramedPhoto
                src={photo.url}
                alt={photo.alt}
                priority={priority && index === 0}
                sizes="(orientation: landscape) and (min-width: 1024px) 55vw, 100vw"
                focus={photo}
              />
            </button>
          </li>
        ))}
      </ul>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop click mirrors Escape, which the native dialog already handles */}
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        // A click on the backdrop (outside the photo) closes it too
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-background/95 p-0 backdrop:bg-foreground/60"
      >
        {open && (
          <div className="relative size-full">
            <Image
              src={open.url}
              alt={open.alt}
              fill
              sizes="100vw"
              className="object-contain p-4 sm:p-10"
              onClick={() => dialog.current?.close()}
            />
            <button
              type="button"
              // biome-ignore lint/a11y/noAutofocus: the dialog moves focus to its close button
              autoFocus
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar"
              className="absolute top-4 right-4 inline-flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-md transition-colors hover:bg-surface"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
