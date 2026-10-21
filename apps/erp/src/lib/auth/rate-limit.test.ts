import { describe, expect, it } from "vitest";
import { createAttemptLimiter } from "./rate-limit";

const MIN = 60_000;

describe("attempt limiter", () => {
  it("blocks a key after max failures inside the window", () => {
    const limiter = createAttemptLimiter({ max: 3, windowMs: 15 * MIN });
    for (let i = 0; i < 2; i++) limiter.recordFailure("a", i);
    expect(limiter.isLimited("a", 10)).toBe(false);
    limiter.recordFailure("a", 10);
    expect(limiter.isLimited("a", 11)).toBe(true);
    expect(limiter.isLimited("b", 11)).toBe(false);
  });

  it("forgets failures older than the window", () => {
    const limiter = createAttemptLimiter({ max: 2, windowMs: 15 * MIN });
    limiter.recordFailure("a", 0);
    limiter.recordFailure("a", 1000);
    expect(limiter.isLimited("a", 2000)).toBe(true);
    expect(limiter.isLimited("a", 15 * MIN + 1001)).toBe(false);
  });

  it("reset clears a key", () => {
    const limiter = createAttemptLimiter({ max: 1, windowMs: MIN });
    limiter.recordFailure("a", 0);
    limiter.reset("a");
    expect(limiter.isLimited("a", 1)).toBe(false);
  });

  it("prunes stale keys so memory stays bounded", () => {
    const limiter = createAttemptLimiter({ max: 5, windowMs: MIN, maxKeys: 10 });
    for (let i = 0; i < 10; i++) limiter.recordFailure(`k${i}`, 0);
    limiter.recordFailure("fresh", 10 * MIN);
    expect(limiter.size()).toBe(1);
  });
});
