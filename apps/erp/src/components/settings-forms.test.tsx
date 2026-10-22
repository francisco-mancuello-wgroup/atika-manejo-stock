import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { CurrencyDisplay } from "../lib/currency";
import { formatGs, formatUsd } from "../lib/format";
import { SettingsForm } from "./settings-forms";

const settings = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 100 };
const product = (id: string, units: number) => ({
  id,
  name: `Producto ${id}`,
  originalValueUsd: 100,
  unitsBought: units,
  priceGs: 1_000_000,
});
const lots = [
  {
    id: "lot-a",
    name: "Lote A",
    totalShippingUsd: 20,
    products: [
      { id: "p1", name: "Remera", originalValueUsd: 100, unitsBought: 3, priceGs: 2_000_000 },
      { id: "p2", name: "Short", originalValueUsd: 40, unitsBought: 2, priceGs: 900_000 },
    ],
  },
  {
    id: "lot-b",
    name: "Lote B",
    totalShippingUsd: 0,
    products: [product("p3", 1), product("p4", 1), product("p5", 1), product("p6", 1)],
  },
];
type Action = (previous: FormState, formData: FormData) => Promise<FormState>;
const idle: Action = async () => ({ status: "idle" });

function renderForm(
  action: Action = idle,
  formLots: typeof lots = lots,
  display?: CurrencyDisplay,
) {
  render(<SettingsForm settings={settings} lots={formLots} action={action} display={display} />);
}

describe("SettingsForm", () => {
  it("explains that applying updates every lot but keeps its shipping", () => {
    renderForm();
    expect(
      screen.getByText(
        "Al guardar, todos los lotes toman de acá el TC, el factor, el IVA y el % de costo, y conservan su propio envío.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the saved settings and always applies them to every lot", () => {
    renderForm();
    expect(screen.getByLabelText("TC del día (₲ / US$)")).toHaveValue(7400);
    expect(screen.getByLabelText("Factor de venta por defecto")).toHaveValue(2.5);
    expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(100);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Se recalculan 2 lotes · 6 productos")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar y aplicar a todos los lotes" }),
    ).toBeInTheDocument();
  });

  it("uses the singular in the summary for one lot with one product", () => {
    renderForm(idle, [
      { id: "lot-a", name: "Lote A", totalShippingUsd: 0, products: [product("p1", 1)] },
    ]);
    expect(screen.getByText("Se recalcula 1 lote · 1 producto")).toBeInTheDocument();
  });

  it("submits only the values", async () => {
    const action = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Parámetros guardados. Se actualizaron 2 lotes y se recalcularon 17 precios.",
      }),
    );
    renderForm(action);
    fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y aplicar a todos los lotes" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Se actualizaron 2 lotes");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("vatPercent")).toBe("5");
    expect(data.has("scope")).toBe(false);
    expect(data.has("lotIds")).toBe(false);
  });

  it("shows field errors", async () => {
    const action: Action = async () => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { vatPercent: "El IVA no puede superar 100." },
      values: { vatPercent: "250" },
    });
    renderForm(action);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y aplicar a todos los lotes" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByText("El IVA no puede superar 100.")).toBeInTheDocument();
    expect(screen.getByLabelText("IVA (%)")).toHaveAttribute("aria-invalid", "true");
  });

  it("explains how prices are calculated as numbered steps", () => {
    renderForm();
    const steps = within(
      screen.getByRole("list", { name: "Cómo se calcula el precio" }),
    ).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Envío por unidad");
    expect(steps[0]).toHaveTextContent("Envío total del lote ÷ unidades compradas");
    expect(steps[1]).toHaveTextContent("Costo unitario");
    expect(steps[2]).toHaveTextContent("Precio de venta");
    expect(steps[2]).toHaveTextContent("Redondeado a 1.000 ₲");
  });

  describe("Ver cálculo por lote", () => {
    const table = () => screen.getByRole("table", { name: "Cálculo por lote" });

    it("lists a select with every lot, defaulting to the first one", () => {
      renderForm();
      expect(screen.getByRole("heading", { name: "Ver cálculo por lote" })).toBeInTheDocument();
      const select = screen.getByLabelText("Lote");
      expect(select).toHaveValue("lot-a");
      expect(
        within(select)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Lote A", "Lote B"]);
    });

    it("shows each product of the lot with the current form values", () => {
      renderForm();
      const headers = within(table())
        .getAllByRole("columnheader")
        .map((h) => h.textContent);
      expect(headers).toEqual([
        "Producto",
        "Unidades compradas",
        "Valor original (US$)",
        "Envío por unidad (US$)",
        "Costo unitario (US$)",
        "Precio actual",
        "Precio nuevo",
        "Diferencia",
      ]);
      const [, remera, short] = within(table()).getAllByRole("row");
      const cells = (row: HTMLElement | undefined) =>
        within(row as HTMLElement)
          .getAllByRole("cell")
          .map((c) => c.textContent);
      expect(cells(remera)).toEqual([
        "Remera",
        "3",
        formatUsd(100),
        formatUsd(4),
        formatUsd(104),
        formatGs(2_000_000),
        formatGs(2_116_000),
        `+${formatGs(116_000)}`,
      ]);
      expect(cells(short)?.slice(5)).toEqual([
        formatGs(900_000),
        formatGs(895_000),
        formatGs(-5_000),
      ]);
    });

    it("recomputes live from unsaved form values", () => {
      renderForm();
      fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "0" } });
      const [, remera] = within(table()).getAllByRole("row");
      // 104 * 2.5 * 1 * 7400 = 1.924.000
      expect(remera?.textContent).toContain(formatGs(1_924_000));
    });

    it("switches the lot with the select", () => {
      renderForm();
      fireEvent.change(screen.getByLabelText("Lote"), { target: { value: "lot-b" } });
      expect(within(table()).getByText("Producto p3")).toBeInTheDocument();
      expect(within(table()).queryByText("Remera")).not.toBeInTheDocument();
    });

    it("asks to complete the parameters while an input is invalid", () => {
      renderForm();
      fireEvent.change(screen.getByLabelText("TC del día (₲ / US$)"), { target: { value: "" } });
      expect(screen.getByText("Completá los parámetros para ver el cálculo.")).toBeInTheDocument();
      expect(screen.queryByRole("table", { name: "Cálculo por lote" })).not.toBeInTheDocument();
    });

    it("shows prices in dollars with the exchange rate of the day", () => {
      renderForm(idle, lots, { currency: "usd", exchangeRate: 7400 });
      const [, remera] = within(table()).getAllByRole("row");
      expect(remera?.textContent).toContain(formatUsd(2_000_000 / 7400));
      expect(remera?.textContent).toContain(formatUsd(2_116_000 / 7400));
    });

    it("explains a lot without bought units", () => {
      renderForm(idle, [{ id: "x", name: "Vacío", totalShippingUsd: 5, products: [] }]);
      expect(screen.getByText("Este lote no tiene unidades compradas.")).toBeInTheDocument();
    });

    it("explains there are no lots yet", () => {
      renderForm(idle, []);
      expect(screen.getByText("Todavía no hay lotes.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Lote")).not.toBeInTheDocument();
    });
  });
});
