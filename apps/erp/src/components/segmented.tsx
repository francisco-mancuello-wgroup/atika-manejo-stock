import { cn } from "@atika/ui";

/** Class names of one segment: the active one is filled ink with surface text. */
export function segmentClass(active: boolean): string {
  return cn(
    "inline-flex h-9 items-center justify-center whitespace-nowrap px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-subtle",
  );
}

export const segmentedClass = "inline-flex w-fit border border-line";

/** Single-choice control made of buttons; the chosen one is `aria-pressed`. */
export function SegmentedButtons<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={cn(segmentedClass, "min-w-0 p-0")}>
      <legend className="sr-only">{label}</legend>
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={segmentClass(value === option)}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}
