import { type GroupWindow, isGroupActive } from "./stock";

export type GroupStatus = "Activo" | "Programado" | "Vencido" | "Inactivo";

/** Label of a group at `now`: the switch decides Inactivo, the window the rest. */
export function groupStatus(group: GroupWindow, now: Date): GroupStatus {
  if (!group.isActive) return "Inactivo";
  if (isGroupActive(group, now)) return "Activo";
  return group.startsAt && group.startsAt > now ? "Programado" : "Vencido";
}

/** Value for an `input[type=date]`; blank means "no limit". */
export function dateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** A date-only end covers its whole day (the domain compares instants, ends inclusive). */
export function endOfDayInput(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}
