import { mergePromoGroups, type PromoBank, type PromoGroup } from "@atika/pricing";
import Image from "next/image";
import Link from "next/link";

/** A bank's logo, or its name in a chip when it has none. */
export function BankBadge({ bank }: { bank: PromoBank }) {
  if (bank.logoUrl === null) {
    return (
      <span className="inline-flex h-8 items-center border border-border bg-surface px-2 text-xs text-foreground">
        {bank.name}
      </span>
    );
  }
  return (
    <Image
      src={bank.logoUrl}
      alt={bank.name}
      width={64}
      height={32}
      sizes="64px"
      className="h-8 w-16 object-contain"
    />
  );
}

/**
 * "Nuestras promociones bancarias" of a product: what each promo offers and which banks, with a
 * link to the terms. Hidden when no promo applies. Groups of several products (the garments of a
 * set) are merged by headline.
 */
export function BankPromosBlock({ groups }: { groups: readonly PromoGroup[] }) {
  const merged = mergePromoGroups(groups);
  if (merged.length === 0) return null;
  return (
    <section
      aria-label="Nuestras promociones bancarias"
      className="flex flex-col gap-3 border border-border bg-surface p-4"
    >
      <p className="text-[11px] tracking-[2.4px] text-fg-muted uppercase">
        Nuestras promociones bancarias
      </p>
      <ul className="flex flex-col gap-3">
        {merged.map((group) => (
          <li key={`${group.name ?? ""}|${group.headline}`} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{group.name ?? group.headline}</p>
            {group.name ? <p className="text-xs text-fg-muted">{group.headline}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              {group.banks.map((bank) => (
                <BankBadge key={bank.id} bank={bank} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/promociones-bancarias"
        className="self-start text-xs text-fg-muted underline underline-offset-4 hover:text-foreground"
      >
        Ver bases y condiciones
      </Link>
    </section>
  );
}
