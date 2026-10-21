import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

const from = (headers: Record<string, string>) => clientIpFrom((name) => headers[name] ?? null);

describe("clientIpFrom", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(from({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" })).toBe("203.0.113.9");
  });
  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(from({ "x-real-ip": "198.51.100.2" })).toBe("198.51.100.2");
    expect(from({})).toBe("unknown");
  });
});
