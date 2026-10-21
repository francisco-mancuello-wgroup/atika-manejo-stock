import Image from "next/image";

/** The "átika" logo (240×68 source, shown at 120×33 like atika.com.py). */
export function AtikaWordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/atika-logo.png"
      alt="Átika"
      width={120}
      height={33}
      priority
      className={className ?? "h-auto w-[120px]"}
    />
  );
}
