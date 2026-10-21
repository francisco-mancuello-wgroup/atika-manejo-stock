import { buttonVariants, cn, Wordmark } from "@atika/ui";
import Link from "next/link";
import { CATEGORIES } from "../lib/categories";

// The store number is a catalog setting (later feature); until then the link opens WhatsApp
// without a prefilled recipient.
const DEFAULT_WHATSAPP_HREF = "https://wa.me/";

export function Topbar({ whatsappHref = DEFAULT_WHATSAPP_HREF }: { whatsappHref?: string }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-line bg-surface px-6 py-4">
      <Link href="/" className="flex flex-col gap-1.5 text-ink">
        <Wordmark className="h-6" />
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted md:block">
          CASA ICONA
        </span>
      </Link>
      <nav aria-label="Categorías" className="hidden items-center gap-6 text-sm text-muted md:flex">
        {CATEGORIES.map((category) => (
          <Link key={category.slug} href={`/${category.slug}`} className="hover:text-ink">
            {category.label}
          </Link>
        ))}
      </nav>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "whatsapp", size: "sm" }))}
      >
        Escribinos
      </a>
    </header>
  );
}
