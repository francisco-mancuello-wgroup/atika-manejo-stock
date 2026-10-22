import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { BankPromoSummary } from "../lib/queries/bank-promos";
import { type BankPromoActions, BankPromosView } from "./bank-promos-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const itau = { id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" };
const conti = { id: "b2", name: "Continental", logoUrl: null };

const promos: BankPromoSummary[] = [
  {
    id: "p1",
    kind: "installments",
    value: 12,
    days: [],
    capGs: null,
    isActive: true,
    scope: "all",
    startsAt: null,
    endsAt: "2026-12-31",
    lotCount: 0,
    productCount: 0,
    banks: [itau, conti],
  },
  {
    id: "p2",
    kind: "refund",
    value: 20,
    days: [4],
    capGs: 200_000,
    isActive: false,
    scope: "products",
    startsAt: "2026-11-01",
    endsAt: null,
    lotCount: 0,
    productCount: 12,
    banks: [conti],
  },
  {
    id: "p3",
    kind: "discount",
    value: 15,
    days: [],
    capGs: null,
    isActive: true,
    scope: "lots",
    startsAt: "2026-11-01",
    endsAt: null,
    lotCount: 3,
    productCount: 0,
    banks: [itau],
  },
];

const actions = () => ({
  setActive: vi.fn<BankPromoActions["setActive"]>(ok),
  remove: vi.fn<BankPromoActions["remove"]>(ok),
});

const renderView = (a: BankPromoActions = actions(), list = promos) =>
  render(<BankPromosView promos={list} today="2026-10-21" actions={a} />);

describe("BankPromosView", () => {
  it("lists headline, banks, scope, window and status of every promo", () => {
    renderView();
    const rows = screen.getAllByRole("row").slice(1);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("Hasta 12 cuotas sin intereses")).toBeInTheDocument();
    expect(first.getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(first.getByText("Continental")).toBeInTheDocument();
    expect(first.getByText("Todos los productos")).toBeInTheDocument();
    expect(first.getByText("Hasta 31/12/2026")).toBeInTheDocument();
    expect(first.getByText("Vigente")).toBeInTheDocument();

    const second = within(rows[1] as HTMLElement);
    expect(second.getByText("20 % de reintegro · Jueves · Tope ₲ 200.000")).toBeInTheDocument();
    expect(second.getByText("12 productos")).toBeInTheDocument();
    expect(second.getByText("Desde 01/11/2026")).toBeInTheDocument();
    expect(second.getByText("Inactiva")).toBeInTheDocument();

    const third = within(rows[2] as HTMLElement);
    expect(third.getByText("3 lotes")).toBeInTheDocument();
    expect(third.getByText("Programada")).toBeInTheDocument();
  });

  it("marks a promo past its end date as Vencida", () => {
    render(
      <BankPromosView
        promos={[promos[0] as BankPromoSummary]}
        today="2027-01-01"
        actions={actions()}
      />,
    );
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });

  it("links to the new and edit pages", () => {
    renderView();
    expect(screen.getByRole("link", { name: "Nueva promoción" })).toHaveAttribute(
      "href",
      "/promos/bancos/nueva",
    );
    expect(
      screen.getByRole("link", { name: "Editar: 20 % de reintegro · Jueves · Tope ₲ 200.000" }),
    ).toHaveAttribute("href", "/promos/bancos/p2");
  });

  it("explains the empty state", () => {
    renderView(actions(), []);
    expect(screen.getByText("Todavía no creaste promociones.")).toBeInTheDocument();
  });

  it("toggles a promo through the action", async () => {
    const a = actions();
    renderView(a);
    fireEvent.click(
      screen.getByRole("switch", { name: "Activo: 20 % de reintegro · Jueves · Tope ₲ 200.000" }),
    );
    await waitFor(() => expect(a.setActive).toHaveBeenCalledWith("p2", true));
  });

  it("asks for confirmation before deleting", async () => {
    const a = actions();
    const confirm = vi.spyOn(window, "confirm");
    renderView(a);
    const button = () => screen.getByRole("button", { name: "Eliminar: 15 % de descuento" });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(button());
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("15 % de descuento"));
    expect(a.remove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(button());
    await waitFor(() => expect(a.remove).toHaveBeenCalledWith("p3"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
