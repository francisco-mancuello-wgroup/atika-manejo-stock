import { buttonVariants, cn, Wordmark } from "@atika/ui";
import Link from "next/link";
import { whatsappContactUrl } from "../lib/whatsapp";
import { WhatsappIcon } from "./icons";
import { TopbarSearch } from "./topbar-search";

/** `whatsappNumber` is the catalog setting; without it the link opens WhatsApp with no recipient. */
export function Topbar({ whatsappNumber = "" }: { whatsappNumber?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-surface px-5 py-4 md:px-7 lg:px-8">
      <div className="flex flex-1 items-center">
        <Link href="/" className="flex flex-col gap-1.5 text-ink">
          <Wordmark className="h-6" />
          <span className="hidden text-[9px] font-medium uppercase tracking-[0.2em] text-muted lg:block">
            CASA ICONA
          </span>
        </Link>
      </div>
      <TopbarSearch />
      <div className="flex flex-1 items-center justify-end">
        <a
          href={whatsappContactUrl(whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "whatsapp", size: "md" }), "h-11 px-5")}
        >
          <WhatsappIcon className="size-[18px]" />
          Escribinos
        </a>
      </div>
    </header>
  );
}
