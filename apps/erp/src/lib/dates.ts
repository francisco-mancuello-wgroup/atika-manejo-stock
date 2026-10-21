const TIME_ZONE = "America/Asuncion";

/** Current calendar day in Asunción as `yyyy-mm-dd` (en-CA formats dates that way). */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthStartIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Date-only columns are stored as UTC midnight. */
export function toDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
