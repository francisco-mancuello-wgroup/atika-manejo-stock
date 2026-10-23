"use client";

import { autoFit, frameLayout } from "@atika/ui";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type Focus, objectPosition } from "../lib/focus";

interface FramedPhotoProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Focal point and zoom of the photo; centered and automatic when omitted. */
  focus?: Partial<Focus>;
  className?: string;
}

interface Size {
  width: number;
  height: number;
}

/**
 * A photo inside a frame of fixed size (the nearest positioned ancestor). It is drawn by
 * `frameLayout` from the measured frame, the photo's natural size and its focal point and zoom
 * (whole photo at 0, filling the frame at 100, automatic when unset), so every photo takes the
 * same frame. The inner box has the photo's own proportions, so `object-cover` inside it never
 * crops. Until both sizes are known (server render, first paint) it falls back to plain
 * `object-cover` around the focal point, which is also the look of a zoom of 100.
 */
export function FramedPhoto({ src, alt, sizes, priority, focus, className }: FramedPhotoProps) {
  const root = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [frame, setFrame] = useState<Size | null>(null);
  const [natural, setNatural] = useState<(Size & { src: string }) | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        setFrame({ width: element.clientWidth, height: element.clientHeight });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const read = (element: HTMLImageElement | null) => {
    if (element?.naturalWidth && element.naturalHeight) {
      setNatural({ src, width: element.naturalWidth, height: element.naturalHeight });
    }
  };

  // The photo may have finished loading before React attached `onLoad`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read when the photo changes
  useEffect(() => {
    if (image.current?.complete) read(image.current);
  }, [src]);

  const point = { focusX: focus?.focusX ?? 50, focusY: focus?.focusY ?? 50 };
  const known = natural?.src === src ? natural : null;
  const layout =
    frame && known
      ? frameLayout({
          frameW: frame.width,
          frameH: frame.height,
          imageW: known.width,
          imageH: known.height,
          ...point,
          fit: focus?.fit ?? autoFit(known.width, known.height, frame.width, frame.height),
        })
      : null;

  return (
    <div ref={root} className={`absolute inset-0 overflow-hidden bg-surface ${className ?? ""}`}>
      <div
        className="absolute inset-0"
        style={
          layout
            ? {
                inset: "auto",
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
              }
            : undefined
        }
      >
        <Image
          ref={image}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={(event) => read(event.currentTarget)}
          className="object-cover"
          style={layout ? undefined : { objectPosition: objectPosition(point) }}
        />
      </div>
    </div>
  );
}
