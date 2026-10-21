import { cn, Wordmark } from "@atika/ui";
import Image from "next/image";
import Link from "next/link";
import { formatGs } from "../lib/format";
import type { PresentationCollection, PresentationPiece } from "../lib/presentation";
import { pieceLink } from "../lib/whatsapp";
import { PhotoCarousel } from "./photo-carousel";
import { SizePicker } from "./size-picker";

interface Contact {
  whatsappNumber: string;
  messageTemplate: string;
  /** Origin of the site, to build absolute links to the pieces ("" for relative ones). */
  origin: string;
}

const EYEBROW = "text-[11px] font-medium uppercase tracking-[0.15em] text-ink";

const pad = (value: number) => String(value).padStart(2, "0");

function PieceSection({
  piece,
  collection,
  index,
  contact,
}: {
  piece: PresentationPiece;
  collection: PresentationCollection;
  index: number;
  contact: Contact;
}) {
  return (
    <section
      id={`${collection.slug}-pagina-${index + 1}`}
      aria-label={piece.name}
      className="flex h-svh snap-start flex-col landscape:lg:grid landscape:lg:grid-cols-[1.15fr_1fr]"
    >
      <PhotoCarousel
        photos={piece.photos}
        name={piece.name}
        priority={index < 2}
        className="mt-14 min-h-0 flex-1 landscape:lg:mt-0 landscape:lg:h-full landscape:lg:pt-14"
      />
      <div className="flex max-h-[55svh] flex-col gap-6 overflow-y-auto p-6 sm:p-10 landscape:lg:max-h-none landscape:lg:justify-center landscape:lg:gap-6 landscape:lg:p-16">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            {collection.name} · Colección seleccionada
          </p>
          <p className="shrink-0 font-display text-sm font-light text-muted">
            {pad(index + 1)} / {collection.pieces.length}
          </p>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[28px] font-light leading-tight text-ink sm:text-[34px] landscape:lg:text-[44px]">
            {piece.name}
          </h2>
          <p className="shrink-0 whitespace-nowrap text-base tracking-[1px] text-ink sm:text-lg">
            {piece.priceGs === null ? "Consultar precio" : formatGs(piece.priceGs)}
          </p>
        </div>

        {piece.description ? (
          <p className="hidden text-sm leading-relaxed text-muted sm:block">{piece.description}</p>
        ) : null}

        <div className="flex flex-col gap-5">
          {piece.color ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              {piece.color.hex ? (
                <span
                  data-testid="swatch"
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: piece.color.hex }}
                />
              ) : null}
              {piece.color.label}
            </p>
          ) : null}
          <SizePicker
            name={piece.name}
            sizes={piece.sizes}
            colorLabel={piece.color?.label ?? null}
            priceGs={piece.priceGs}
            link={pieceLink(contact.origin, collection.slug, index + 1)}
            whatsappNumber={contact.whatsappNumber}
            messageTemplate={contact.messageTemplate}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Full-screen presentation of one collection: a cover and one snap-scrolling section per piece.
 * Sections are server-rendered; only the carousel (and the size picker) are client components.
 */
export function Presentation({
  collection,
  ...contact
}: { collection: PresentationCollection } & Contact) {
  const cover = collection.pieces.find((piece) => piece.photos.length > 0)?.photos[0];
  const count = collection.pieces.length;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between bg-bg/85 px-5 backdrop-blur-sm sm:px-8",
          EYEBROW,
        )}
      >
        <Link
          href="/"
          className="tracking-[0.18em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          ← Catálogos
        </Link>
        <span className="tracking-[0.18em]">{collection.name}</span>
      </header>

      <div className="fixed inset-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section
          id={`${collection.slug}-portada`}
          aria-label="Portada"
          className="flex h-svh snap-start flex-col items-center justify-center gap-4 px-6 pt-14 pb-6 text-center"
        >
          <Wordmark className="h-7 text-ink" />
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{collection.name}</p>
          {cover ? (
            <div className="relative h-[52svh] max-h-[60svh] w-full max-w-md">
              <Image
                src={cover.url}
                alt={cover.alt}
                fill
                priority
                sizes="(min-width: 768px) 448px, 100vw"
                className="object-contain"
              />
            </div>
          ) : null}
          <h1 className="font-display text-[34px] font-light leading-tight text-ink lg:text-[44px]">
            Colección seleccionada
          </h1>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            {count} {count === 1 ? "pieza" : "piezas"} · Deslizá para ver
          </p>
        </section>

        {collection.pieces.map((piece, index) => (
          <PieceSection
            key={piece.id}
            piece={piece}
            collection={collection}
            index={index}
            contact={contact}
          />
        ))}
      </div>
    </>
  );
}
