import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { DiscountSummary } from "../lib/queries/discounts";
import { DiscountsView } from "./discounts-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const discounts: DiscountSummary[] = [
  {
    id: "d1",
    name: "Liquidación",
    percent: 20,
    isActive: true,
    scope: "all",
    startsAt: null,
    endsAt: "2026-12-31",
    productCount: 0,
  },
  {
    id: "d2",
    name: "Vestidos",
    percent: 35,
    isActive: false,
    scope: "selected",
    startsAt: "2026-11-01",
    endsAt: null,
    productCount: 3,
  },
];

const actions = () => ({ setActive: vi.fn(ok), remove: vi.fn(ok) });

describe("DiscountsView", () => {
  it("lists name, percent, scope, validity and state of every discount", () => {
    render(<DiscountsView discounts={discounts} actions={actions()} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0] as HTMLElement).getByText("Liquidación")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("20 %")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("Todos")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("Hasta 31/12/2026")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("3 productos")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Desde 01/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Activo: Liquidación" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Activo: Vestidos" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("links to the new and edit pages", () => {
    render(<DiscountsView discounts={discounts} actions={actions()} />);
    expect(screen.getByRole("link", { name: "Nuevo descuento" })).toHaveAttribute(
      "href",
      "/promos/descuentos/nuevo",
    );
    expect(screen.getByRole("link", { name: "Editar: Vestidos" })).toHaveAttribute(
      "href",
      "/promos/descuentos/d2",
    );
  });

  it("explains the empty state", () => {
    render(<DiscountsView discounts={[]} actions={actions()} />);
    expect(screen.getByText("Todavía no creaste descuentos.")).toBeInTheDocument();
  });

  it("toggles a discount through the action", async () => {
    const a = actions();
    render(<DiscountsView discounts={discounts} actions={a} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Vestidos" }));
    await waitFor(() => expect(a.setActive).toHaveBeenCalledWith("d2", true));
  });

  it("asks for confirmation before deleting", async () => {
    const a = actions();
    const confirm = vi.spyOn(window, "confirm");
    render(<DiscountsView discounts={discounts} actions={a} />);

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Vestidos" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Vestidos"));
    expect(a.remove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Vestidos" }));
    await waitFor(() => expect(a.remove).toHaveBeenCalledWith("d2"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows the error when an action fails", async () => {
    const a = {
      setActive: async (): Promise<FormState> => ({ status: "error", message: "No se pudo." }),
      remove: vi.fn(ok),
    };
    render(<DiscountsView discounts={discounts} actions={a} />);
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Vestidos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo.");
  });
});
