import { cn } from "@atika/ui";
import type { ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <span className="text-xs text-muted">{hint}</span> : null}
      {error ? (
        <span id={`${htmlFor}-error`} className="text-xs text-warn">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-none border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function FormMessage({
  state,
}: {
  state: { status: "idle" } | { status: "success" | "error"; message: string };
}) {
  if (state.status === "idle") return null;
  const success = state.status === "success";
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn("px-3 py-2 text-sm", success ? "bg-subtle text-ok" : "bg-warnbg text-warn")}
    >
      {state.message}
    </p>
  );
}
