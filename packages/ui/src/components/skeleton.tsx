import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Placeholder block shown while content loads. Purely decorative: the loading
 * region that wraps skeletons is what gets announced. The pulse is dropped for
 * users who prefer reduced motion.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-skeleton
      className={cn("animate-pulse bg-subtle motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
