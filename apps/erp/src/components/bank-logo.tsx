import Image from "next/image";

/** A bank's logo, or its name in a chip when it has none. */
export function BankLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl === null) {
    return (
      <span className="inline-flex h-8 items-center border border-line bg-subtle px-2 text-xs font-medium text-ink">
        {name}
      </span>
    );
  }
  return (
    <Image
      src={logoUrl}
      alt={name}
      width={64}
      height={32}
      sizes="64px"
      className="h-8 w-16 object-contain"
    />
  );
}
