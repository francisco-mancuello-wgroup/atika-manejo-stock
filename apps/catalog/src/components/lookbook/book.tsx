import { cn } from "@atika/ui";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import pinkPhoto from "../../../public/atika/pink.jpg";
import { type LookbookPage, PINK_EVENT, pageAnchor } from "../../lib/lookbook";
import { searchEntriesOf } from "../../lib/search";
import { AddToCart } from "./add-to-cart";
import { ArrowIcon } from "./icons";
import { PiecePhotos } from "./piece-photos";
import { LookbookSearch } from "./search";
import { AtikaWordmark } from "./wordmark";

/*
 * A catalog as a vertical lookbook, like its PDF: one full-screen page per piece with scroll
 * snapping, so a tablet flips page by page. Portrait (phones, upright tablets): photo on top,
 * details below. Wide screens (desktop, tablets sideways): photo and details side by side, like
 * an open magazine.
 */

const pad = (n: number) => String(n).padStart(2, "0");

const INTRO_ID = "catalogos";

export interface BookCatalog {
  slug: string;
  name: string;
  tagline: string;
  cover: StaticImageData;
  pages: LookbookPage[];
}

/**
 * Fixed top bar. On a catalog page: "Catálogos" back to the home, the catalog name and search.
 * On the home (`home`) only search: the home already shows the logo and the catalogs.
 */
function BookBar({
  title,
  home,
  catalogs,
}: {
  title: string;
  home: boolean;
  catalogs: BookCatalog[];
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 pr-16 pl-4 lg:pr-20 lg:pl-8">
      {home ? (
        <span />
      ) : (
        <Link
          href="/"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-background/85 px-4 text-xs tracking-[2px] uppercase backdrop-blur"
        >
          <ArrowIcon className="size-3.5 rotate-180" />
          Catálogos
        </Link>
      )}
      <div className="flex items-center gap-2">
        {!home && (
          <span className="pointer-events-auto hidden rounded-full bg-background/85 px-4 py-2 text-xs tracking-[2.4px] uppercase backdrop-blur sm:inline">
            {title}
          </span>
        )}
        <LookbookSearch
          entries={catalogs.flatMap((catalog) => searchEntriesOf(catalog, catalog.pages))}
        />
      </div>
    </div>
  );
}

function CoverPage({ catalog }: { catalog: BookCatalog }) {
  return (
    <section
      aria-label={catalog.name}
      className="relative flex h-svh snap-start flex-col items-center justify-between overflow-hidden bg-background px-6 pt-20 pb-10 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <AtikaWordmark />
        <p className="text-[11px] tracking-[3px] text-fg-muted uppercase">{catalog.name}</p>
      </div>
      <div className="relative w-full max-w-[34rem] flex-1 py-6">
        <div className="relative size-full">
          <Image
            src={catalog.cover}
            alt={`${catalog.name} — ${catalog.tagline}`}
            fill
            priority
            sizes="(min-width: 1024px) 34rem, 90vw"
            placeholder="blur"
            className="object-contain"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-heading text-[34px] leading-tight lg:text-[44px]">{catalog.tagline}</h2>
        <p className="text-[11px] tracking-[3px] text-fg-muted uppercase">
          {catalog.pages.length} {catalog.pages.length === 1 ? "pieza" : "piezas"} · Deslizá para
          ver
        </p>
      </div>
    </section>
  );
}

function PiecePage({
  page,
  anchor,
  total,
  catalogName,
  link,
}: {
  page: LookbookPage;
  anchor: string;
  total: number;
  catalogName: string;
  link: string;
}) {
  const set = page.items.length > 1;
  const description = page.pieces[0]?.description;
  return (
    <section
      id={anchor}
      aria-label={page.title}
      className="flex h-svh snap-start flex-col bg-background pt-14 landscape:lg:grid landscape:lg:grid-cols-[1.15fr_1fr] landscape:lg:pt-0"
    >
      <PiecePhotos
        photos={page.photos}
        label={`Fotos de ${page.title}`}
        priority={page.page <= 2}
      />

      <div className="flex max-h-[55svh] flex-col gap-4 overflow-y-auto px-6 pt-5 pb-8 sm:px-10 landscape:lg:max-h-none landscape:lg:justify-center landscape:lg:gap-6 landscape:lg:px-16">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[11px] tracking-[2.4px] text-fg-muted uppercase">
            {[page.brand ?? catalogName, page.section].filter(Boolean).join(" · ")}
          </p>
          <p className="font-heading text-sm text-fg-muted">
            {pad(page.page)} / {pad(total)}
          </p>
        </div>
        {set && (
          <h2 className="font-heading text-[28px] leading-tight sm:text-[34px] landscape:lg:text-[44px]">
            {page.title}
          </h2>
        )}
        {set && description && (
          <p className="-mt-2 hidden text-sm text-fg-muted sm:block">{description}</p>
        )}
        <AddToCart items={page.items} set={set} description={description ?? null} link={link} />
      </div>
    </section>
  );
}

function EndPage() {
  return (
    <section className="flex h-svh snap-start flex-col items-center justify-center gap-6 bg-primary px-6 text-center text-on-accent">
      <h2 className="font-heading text-[30px] lg:text-[40px]">¿Te gustó alguna pieza?</h2>
      <p className="max-w-md text-on-accent-muted">
        Agregala al carrito y tocá “Pagar”: te escribimos por WhatsApp para coordinar el pago y la
        entrega.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center border border-on-accent-muted px-[30px] text-[15px] tracking-[1px]"
      >
        Ver otros catálogos
      </Link>
    </section>
  );
}

/**
 * One catalog, or several chained one after the other (Casa Icona, then Milonga, then Sordo),
 * each opening with its cover. With an `intro` (the home's covers) the bar keeps only search.
 */
export function LookbookBook({
  title,
  catalogs,
  origin,
  pagePath,
  intro,
}: {
  title: string;
  catalogs: BookCatalog[];
  /** Site origin for the links in the order message ("" keeps them relative). */
  origin: string;
  /** Path the anchors live on: "/" on the home, the catalog route otherwise. */
  pagePath: string;
  intro?: ReactNode;
}) {
  return (
    <div data-lookbook>
      <BookBar title={title} home={intro !== undefined} catalogs={catalogs} />
      {intro && (
        <div id={INTRO_ID} className="min-h-svh snap-start pt-14">
          {intro}
        </div>
      )}
      {catalogs.map((catalog) => (
        <div key={catalog.slug} id={catalog.slug}>
          <CoverPage catalog={catalog} />
          {catalog.pages.length === 0 ? (
            <section className="flex h-svh snap-start items-center justify-center px-6 text-center text-fg-muted">
              Este catálogo no tiene piezas disponibles por ahora.
            </section>
          ) : (
            catalog.pages.map((page) => {
              const anchor = pageAnchor(catalog.slug, page.page);
              return (
                <PiecePage
                  key={anchor}
                  page={page}
                  anchor={anchor}
                  total={catalog.pages.length}
                  catalogName={catalog.name}
                  link={`${origin}${pagePath}#${anchor}`}
                />
              );
            })
          )}
        </div>
      ))}
      <EndPage />
    </div>
  );
}

/** The Pink banner on top of the home: its photo and a link to its selection. */
function PinkBanner() {
  return (
    <section
      aria-labelledby="pink-heading"
      className="mb-12 flex flex-col overflow-hidden rounded-[4px] bg-pink sm:flex-row-reverse lg:mb-16"
    >
      {/* Same 2:3 shape as the photo, so the model shows whole */}
      <div className="relative aspect-[2/3] sm:h-[560px] sm:shrink-0 lg:h-[720px]">
        <Image
          src={pinkPhoto}
          alt="Vestido Cora Fucsia de Casa Icona"
          fill
          priority
          sizes="(min-width: 1024px) 480px, (min-width: 640px) 374px, 100vw"
          placeholder="blur"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-8 sm:px-10 sm:py-12 lg:px-20">
        <h2 id="pink-heading" className="font-heading text-[44px] leading-tight lg:text-[76px]">
          Pink
        </h2>
        <p className="max-w-[440px] text-[15px] leading-relaxed text-foreground/80 lg:text-[17px]">
          Casa Icona, Milonga y Sordo, juntas en un solo lugar. Elegí tus piezas favoritas y pagá
          por WhatsApp.
        </p>
        <a
          href={`/catalogos/${PINK_EVENT}`}
          className="mt-2 inline-flex min-h-12 w-fit items-center justify-center bg-foreground px-8 text-[15px] tracking-[1px] text-background transition-colors hover:bg-foreground/90"
        >
          Ver selección Pink
        </a>
      </div>
    </section>
  );
}

/** Fewer catalogs (the empty ones are hidden) stay centered at the width of three columns. */
const SHELF_COLUMNS: Record<number, string> = {
  1: "max-w-[440px]",
  2: "max-w-[920px] sm:grid-cols-2",
};

/** Home's first screen: Pink (when the event has pieces), then the catalog covers and "Ver todo". */
export function CatalogShelf({ catalogs, pink }: { catalogs: BookCatalog[]; pink: boolean }) {
  return (
    <section
      aria-labelledby="shelf-heading"
      className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-10 lg:py-8"
    >
      <div className="mb-6 flex justify-center lg:mb-8">
        <AtikaWordmark />
      </div>
      {pink ? <PinkBanner /> : null}
      <div className="mb-8 flex flex-col items-center gap-3 text-center lg:mb-12">
        <h1 id="shelf-heading" className="font-heading text-[34px] leading-tight lg:text-[44px]">
          Catálogos
        </h1>
        <p className="max-w-[560px] text-fg-muted">
          Elegí un catálogo y pasá las páginas. Agregá tus prendas al carrito y pagá por WhatsApp.
        </p>
        {/* The catalogs follow below: jump to the first one */}
        <a
          href={`#${catalogs[0]?.slug ?? ""}`}
          className="mt-2 inline-flex min-h-12 items-center justify-center bg-primary px-[30px] text-[15px] tracking-[1px] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ver todo
        </a>
      </div>
      <ul
        className={cn(
          "mx-auto grid gap-8 sm:gap-4 lg:gap-8",
          SHELF_COLUMNS[catalogs.length] ?? "sm:grid-cols-3",
        )}
      >
        {catalogs.map((catalog) => (
          <li key={catalog.slug}>
            <a href={`#${catalog.slug}`} className="group flex flex-col gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-surface">
                <Image
                  src={catalog.cover}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 640px) 33vw, 100vw"
                  placeholder="blur"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-[11px] tracking-[3px] text-fg-muted uppercase">
                  {catalog.pages.length} {catalog.pages.length === 1 ? "pieza" : "piezas"}
                </p>
                <h2 className="font-heading text-[26px]">{catalog.name}</h2>
                <p className="text-sm text-fg-muted">{catalog.tagline}</p>
                <span className="mt-2 border border-foreground px-[30px] py-[11px] text-[15px] tracking-[1px] transition-colors group-hover:bg-hover">
                  Ver catálogo
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
