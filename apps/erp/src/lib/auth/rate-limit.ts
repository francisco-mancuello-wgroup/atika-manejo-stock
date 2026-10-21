export interface AttemptLimiter {
  isLimited(key: string, now: number): boolean;
  recordFailure(key: string, now: number): void;
  reset(key: string): void;
  size(): number;
}

/**
 * In-memory sliding-window failure counter. State lives in one process only, which is enough for
 * the single-instance deployment; it resets on restart.
 */
export function createAttemptLimiter(options: {
  max: number;
  windowMs: number;
  /** Stale keys are swept once the map grows past this many entries. */
  maxKeys?: number;
}): AttemptLimiter {
  const { max, windowMs, maxKeys = 10_000 } = options;
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((at) => now - at < windowMs);

  function sweep(now: number) {
    for (const key of failures.keys()) {
      const live = recent(key, now);
      if (live.length === 0) failures.delete(key);
      else failures.set(key, live);
    }
  }

  return {
    isLimited: (key, now) => recent(key, now).length >= max,
    recordFailure(key, now) {
      if (failures.size >= maxKeys) sweep(now);
      failures.set(key, [...recent(key, now), now]);
    },
    reset: (key) => {
      failures.delete(key);
    },
    size: () => failures.size,
  };
}
