import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupSummary } from "../lib/queries/catalog-groups";
import { GroupsView } from "./groups-view";

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const groups: GroupSummary[] = [
  {
    id: "g1",
    name: "Verano",
    isActive: true,
    startsAt: "2026-10-01",
    endsAt: "2026-10-31",
    status: "Activo",
    productCount: 2,
    allocated: 18,
    sold: 5,
    remaining: 13,
  },
  {
    id: "g2",
    name: "Liquidación",
    isActive: false,
    startsAt: null,
    endsAt: null,
    status: "Inactivo",
    productCount: 0,
    allocated: 0,
    sold: 0,
    remaining: 0,
  },
];

function actions() {
  return { setActive: vi.fn(ok) };
}

function renderView(
  props: Partial<React.ComponentProps<typeof GroupsView>> = {},
  acts = actions(),
) {
  render(<GroupsView groups={groups} actions={acts} {...props} />);
  return acts;
}

describe("GroupsView table", () => {
  it("has the two tabs with Grupos current", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Secciones del catálogo" });
    expect(within(nav).getByRole("link", { name: "Prendas" })).toHaveAttribute(
      "href",
      "/catalogo-web",
    );
    expect(within(nav).getByRole("link", { name: "Grupos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("lists each group with counts, window and a switch", () => {
    renderView();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByRole("link", { name: "Verano" })).toHaveAttribute(
      "href",
      "/catalogo-web/grupos/g1",
    );
    expect(screen.queryByRole("columnheader", { name: "Estado" })).not.toBeInTheDocument();
    expect(first.getByText("2026-10-01 – 2026-10-31")).toBeInTheDocument();
    expect(
      within(rows[0] as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent)
        .slice(1, 5),
    ).toEqual(["2", "18", "5", "13"]);
    expect(first.getByRole("switch", { name: "Activo: Verano" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const second = within(rows[1] as HTMLElement);
    expect(second.getByText("Sin fecha")).toBeInTheDocument();
    expect(second.getByRole("switch", { name: "Activo: Liquidación" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("flags next to the switch only a switched-on group the web isn't showing", () => {
    const base = groups[0] as GroupSummary;
    renderView({
      groups: [
        base,
        { ...base, id: "g3", name: "Pink", startsAt: "2026-11-01", status: "Programado" },
        { ...base, id: "g4", name: "Invierno", status: "Vencido" },
        groups[1] as GroupSummary,
      ],
    });
    const [active, scheduled, expired, inactive] = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getByRole("switch").closest("td") as HTMLElement);
    expect(active?.textContent).toBe("");
    expect(scheduled).toHaveTextContent("Programado · desde 2026-11-01");
    expect(expired).toHaveTextContent("Vencido");
    expect(inactive?.textContent).toBe("");
  });

  it("opens the group from anywhere on the row, keeping the switch clickable", () => {
    renderView();
    const row = screen.getAllByRole("row")[1] as HTMLElement;
    expect(row).toHaveClass("relative", "cursor-pointer");
    expect(within(row).getByRole("link", { name: "Verano" })).toHaveClass(
      "after:absolute",
      "after:inset-0",
    );
    expect(within(row).getByRole("switch").closest("td")).toHaveClass("relative", "z-10");
  });

  it("explains the empty state and links to the new group page", () => {
    renderView({ groups: [] });
    expect(screen.getByText(/Todavía no hay grupos/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo grupo" })).toHaveAttribute(
      "href",
      "/catalogo-web/grupos/nuevo",
    );
  });

  it("activates through the switch and shows the refusal from the domain", async () => {
    const setActive = vi.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Vestido, talle S ya está en el grupo activo «Verano».",
      }),
    );
    renderView({}, { setActive });
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Liquidación" }));
    expect(setActive).toHaveBeenCalledWith("g2", true);
    expect(await screen.findByRole("alert")).toHaveTextContent("ya está en el grupo activo");
  });
});
