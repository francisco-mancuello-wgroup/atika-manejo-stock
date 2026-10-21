import { monthStartIso, toDbDate, todayIso, toIsoDate } from "./dates";

describe("todayIso", () => {
  it("uses the Asunción calendar day, not UTC", () => {
    // 01:30 UTC on the 22nd is still the 21st in Asunción (UTC-3).
    expect(todayIso(new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-21");
    expect(todayIso(new Date("2026-10-22T12:00:00Z"))).toBe("2026-10-22");
  });
});

describe("monthStartIso", () => {
  it("returns the first day of the month of the given ISO date", () => {
    expect(monthStartIso("2026-10-21")).toBe("2026-10-01");
  });
});

describe("toDbDate / toIsoDate", () => {
  it("round-trips a date-only value as UTC midnight", () => {
    const date = toDbDate("2026-06-23");
    expect(date.toISOString()).toBe("2026-06-23T00:00:00.000Z");
    expect(toIsoDate(date)).toBe("2026-06-23");
  });
});
