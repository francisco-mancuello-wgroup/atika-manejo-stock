import { describe, expect, it } from "vitest";
import { dateInputValue, endOfDayInput, groupStatus } from "./format";

const NOW = new Date("2026-10-22T15:00:00.000Z");

describe("groupStatus", () => {
  it("is Inactivo whenever the switch is off, even inside the window", () => {
    expect(groupStatus({ isActive: false, startsAt: null, endsAt: null }, NOW)).toBe("Inactivo");
  });

  it("is Programado before the window starts", () => {
    const group = { isActive: true, startsAt: new Date("2026-11-01T00:00:00Z"), endsAt: null };
    expect(groupStatus(group, NOW)).toBe("Programado");
  });

  it("is Vencido after the window ended", () => {
    const group = { isActive: true, startsAt: null, endsAt: new Date("2026-10-21T23:59:59Z") };
    expect(groupStatus(group, NOW)).toBe("Vencido");
  });

  it("is Activo inside the window or without one", () => {
    expect(groupStatus({ isActive: true, startsAt: null, endsAt: null }, NOW)).toBe("Activo");
    const group = {
      isActive: true,
      startsAt: new Date("2026-10-01T00:00:00Z"),
      endsAt: new Date("2026-10-22T15:00:00Z"),
    };
    expect(groupStatus(group, NOW)).toBe("Activo");
  });
});

describe("window date helpers", () => {
  it("formats a date for an input[type=date] and blank for no limit", () => {
    expect(dateInputValue(new Date("2026-11-05T00:00:00Z"))).toBe("2026-11-05");
    expect(dateInputValue(null)).toBe("");
  });

  it("makes the end date cover the whole day, and leaves blank or full values alone", () => {
    expect(endOfDayInput("2026-11-05")).toBe("2026-11-05T23:59:59.999Z");
    expect(endOfDayInput("")).toBe("");
    expect(endOfDayInput("2026-11-05T10:00")).toBe("2026-11-05T10:00");
  });
});
