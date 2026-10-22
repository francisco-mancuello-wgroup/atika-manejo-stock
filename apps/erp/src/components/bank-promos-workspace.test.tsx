import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { BankPromoDetail, BankPromoSummary } from "../lib/queries/bank-promos";
import type { BankSummary } from "../lib/queries/banks";
import {
  BankPromosWorkspace,
  type BankPromosWorkspaceActions,
  type WorkspaceSelection,
} from "./bank-promos-workspace";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));

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

const detailOf = (promo: BankPromoSummary): BankPromoDetail => ({
  id: promo.id,
  kind: promo.kind,
  value: promo.value,
  days: promo.days,
  capGs: promo.capGs,
  isActive: promo.isActive,
  scope: promo.scope,
  startsAt: promo.startsAt,
  endsAt: promo.endsAt,
  terms: null,
  bankIds: promo.banks.map((bank) => bank.id),
  lotIds: [],
  productIds: [],
});

const banks: BankSummary[] = [
  { ...itau, promoCount: 2 },
  { ...conti, promoCount: 1 },
  { id: "b3", name: "Sudameris", logoUrl: null, promoCount: 0 },
];

const actions = (): BankPromosWorkspaceActions => ({
  savePromo: vi.fn(ok),
  removePromo: vi.fn(ok),
  saveBank: vi.fn(ok),
  removeBank: vi.fn(ok),
});

const renderWorkspace = (
  props: {
    selection?: WorkspaceSelection;
    promos?: BankPromoSummary[];
    banks?: BankSummary[];
    selectedPromo?: BankPromoDetail | null;
    actions?: BankPromosWorkspaceActions;
  } = {},
) => {
  const list = props.promos ?? promos;
  const selection = props.selection ?? { tab: "promos", id: "p1", isNew: false };
  const selectedPromo =
    props.selectedPromo === undefined
      ? (() => {
          const found = list.find((promo) => promo.id === selection.id);
          return found ? detailOf(found) : null;
        })()
      : props.selectedPromo;
  return render(
    <BankPromosWorkspace
      selection={selection}
      promos={list}
      banks={props.banks ?? banks}
      lots={[{ id: "l1", name: "Lote verano", productCount: 3 }]}
      products={[]}
      selectedPromo={selectedPromo}
      today="2026-10-22"
      actions={props.actions ?? actions()}
    />,
  );
};

const list = () => screen.getByRole("list", { name: "Promociones" });

describe("BankPromosWorkspace list", () => {
  it("lists the promos as links with headline, status and banks", () => {
    renderWorkspace();
    const links = within(list()).getAllByRole("link");
    expect(links).toHaveLength(3);
    const first = within(links[0] as HTMLElement);
    expect(first.getByText("Hasta 12 cuotas sin intereses")).toBeInTheDocument();
    expect(first.getByText("Vigente")).toBeInTheDocument();
    expect(first.getByText("Itaú, Continental")).toBeInTheDocument();
    expect(links[0]).toHaveAttribute("href", "/promos/bancos?promo=p1");

    const second = within(links[1] as HTMLElement);
    expect(second.getByText("20 % de reintegro")).toBeInTheDocument();
    expect(second.getByText("Inactiva")).toBeInTheDocument();
    expect(second.getByText("Continental · Jueves · tope ₲ 200.000")).toBeInTheDocument();
    expect(links[1]).toHaveAttribute("href", "/promos/bancos?promo=p2");

    expect(within(links[2] as HTMLElement).getByText("Programada")).toBeInTheDocument();
  });

  it("marks only the selected promo as the current page", () => {
    renderWorkspace({ selection: { tab: "promos", id: "p2", isNew: false } });
    const links = within(list()).getAllByRole("link");
    expect(links[1]).toHaveAttribute("aria-current", "page");
    expect(links[0]).not.toHaveAttribute("aria-current");
    expect(links[2]).not.toHaveAttribute("aria-current");
  });

  it("filters the list by bank or benefit ignoring case and accents", () => {
    renderWorkspace();
    const search = screen.getByRole("searchbox", { name: "Buscar por banco o beneficio" });
    fireEvent.change(search, { target: { value: "ITAU" } });
    let links = within(list()).getAllByRole("link");
    expect(links).toHaveLength(2);
    fireEvent.change(search, { target: { value: "reintegro" } });
    links = within(list()).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/promos/bancos?promo=p2");
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
  });

  it("switches between promos and banks with links that keep the URL in charge", () => {
    renderWorkspace();
    const tabs = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(tabs).getByRole("link", { name: "Promociones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(tabs).getByRole("link", { name: "Bancos" })).toHaveAttribute(
      "href",
      "/promos/bancos?tab=bancos",
    );
    expect(screen.getByRole("link", { name: "Nueva" })).toHaveAttribute(
      "href",
      "/promos/bancos?nueva=1",
    );
  });
});

describe("BankPromosWorkspace promos pane", () => {
  it("edits the selected promo in the right pane", () => {
    renderWorkspace({ selection: { tab: "promos", id: "p2", isNew: false } });
    expect(screen.getByText("Editar promoción", { selector: "p" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "20 % de reintegro · Jueves · Tope ₲ 200.000",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("20");
  });

  it("opens an empty form for a new promo", () => {
    renderWorkspace({ selection: { tab: "promos", id: null, isNew: true }, selectedPromo: null });
    expect(screen.getByText("Nueva promoción", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cuotas")).toHaveValue("");
  });

  it("explains the empty state when there are no promos", () => {
    renderWorkspace({
      promos: [],
      selection: { tab: "promos", id: null, isNew: false },
      selectedPromo: null,
    });
    expect(
      screen.getByText("Todavía no hay promociones. Creá la primera con Nueva."),
    ).toBeInTheDocument();
  });

  it("remounts the form when the selection changes", () => {
    const view = renderWorkspace();
    fireEvent.change(screen.getByLabelText("Cuotas"), { target: { value: "24" } });
    view.rerender(
      <BankPromosWorkspace
        selection={{ tab: "promos", id: "p3", isNew: false }}
        promos={promos}
        banks={banks}
        lots={[]}
        products={[]}
        selectedPromo={detailOf(promos[2] as BankPromoSummary)}
        today="2026-10-22"
        actions={actions()}
      />,
    );
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("15");
  });

  it("deleting a promo goes to the next one in the list", async () => {
    const a = actions();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWorkspace({ selection: { tab: "promos", id: "p2", isNew: false }, actions: a });
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar: 20 % de reintegro · Jueves · Tope ₲ 200.000" }),
    );
    await waitFor(() => expect(a.removePromo).toHaveBeenCalledWith("p2"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/promos/bancos?promo=p3"));
  });

  it("deleting the only promo goes back to the bare URL", async () => {
    const a = actions();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWorkspace({
      promos: [promos[0] as BankPromoSummary],
      selection: { tab: "promos", id: "p1", isNew: false },
      actions: a,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar: Hasta 12 cuotas sin intereses" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/promos/bancos"));
  });
});

describe("BankPromosWorkspace banks tab", () => {
  const bankSelection = (id: string | null, isNew = false): WorkspaceSelection => ({
    tab: "bancos",
    id,
    isNew,
  });

  it("lists the banks with their logo or name and promo count", () => {
    renderWorkspace({ selection: bankSelection("b2"), selectedPromo: null });
    const items = within(screen.getByRole("list", { name: "Bancos" })).getAllByRole("link");
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText("2 promos")).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText("Continental")).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText("1 promo")).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText("0 promos")).toBeInTheDocument();
    expect(items[0]).toHaveAttribute("href", "/promos/bancos?tab=bancos&banco=b1");
    expect(items[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Nueva" })).toHaveAttribute(
      "href",
      "/promos/bancos?tab=bancos&nuevo=1",
    );
  });

  it("edits the selected bank in the right pane", () => {
    renderWorkspace({ selection: bankSelection("b2"), selectedPromo: null });
    expect(screen.getByText("Editar banco", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Continental");
  });

  it("opens an empty bank form for a new bank", () => {
    renderWorkspace({ selection: bankSelection(null, true), selectedPromo: null });
    expect(screen.getByText("Nuevo banco", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
  });

  it("filters banks by name and explains the empty state", () => {
    const view = renderWorkspace({ selection: bankSelection("b1"), selectedPromo: null });
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar por banco o beneficio" }), {
      target: { value: "sudam" },
    });
    expect(within(screen.getByRole("list", { name: "Bancos" })).getAllByRole("link")).toHaveLength(
      1,
    );
    view.unmount();
    renderWorkspace({ banks: [], selection: bankSelection(null), selectedPromo: null });
    expect(
      screen.getByText("Todavía no hay bancos. Creá el primero con Nueva."),
    ).toBeInTheDocument();
  });

  it("deleting a bank goes to the next one in the banks list", async () => {
    const a = actions();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWorkspace({ selection: bankSelection("b3"), selectedPromo: null, actions: a });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Sudameris" }));
    await waitFor(() => expect(a.removeBank).toHaveBeenCalledWith("b3"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/promos/bancos?tab=bancos&banco=b2"));
  });
});
