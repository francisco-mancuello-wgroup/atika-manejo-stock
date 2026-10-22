import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { LotPricingPanel } from "./lot-pricing-panel";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;
const sentForm = (action: { mock: { calls: unknown[][] } }) =>
  (action.mock.calls[0] ?? [])[1] as FormData;
const idle: Action = async () => ({ status: "idle" });

const params = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 55 };
const globalSettings = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 100 };

function renderPanel(
  props: Partial<{
    mode: "global" | "custom";
    modeAction: Action;
    paramsAction: Action;
  }> = {},
) {
  render(
    <LotPricingPanel
      mode={props.mode ?? "global"}
      params={params}
      globalSettings={globalSettings}
      modeAction={props.modeAction ?? idle}
      paramsAction={props.paramsAction ?? idle}
    />,
  );
}

describe("LotPricingPanel", () => {
  describe("global mode", () => {
    it("shows the values read-only with a link to Parámetros", () => {
      renderPanel();
      const region = screen.getByRole("region", { name: "Precios del lote" });
      expect(region).toHaveTextContent("2,5");
      expect(region).toHaveTextContent("55");
      expect(screen.queryByLabelText("TC del lote (₲ / US$)")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Editar en Parámetros" })).toHaveAttribute(
        "href",
        "/parametros",
      );
    });

    it("shows Global and Propio as tabs, Global active", () => {
      renderPanel();
      const group = screen.getByRole("group", { name: "Modo de precios" });
      const global = within(group).getByRole("button", { name: "Global" });
      const custom = within(group).getByRole("button", { name: "Propio" });
      expect(global).toHaveAttribute("aria-pressed", "true");
      expect(global).toHaveTextContent("Activo");
      expect(custom).toHaveAttribute("aria-pressed", "false");
      expect(custom).toHaveTextContent("Inactivo");
    });

    it("asks the server to switch to Propio without showing a notice", async () => {
      const modeAction = vi.fn(
        async (_p: FormState, _d: FormData): Promise<FormState> => ({
          status: "success",
          message: "El lote ahora usa parámetros propios. Parámetros ya no lo modifica.",
        }),
      );
      renderPanel({ modeAction });
      fireEvent.click(screen.getByRole("button", { name: "Propio" }));
      await waitFor(() => expect(modeAction).toHaveBeenCalled());
      expect(sentForm(modeAction).get("mode")).toBe("custom");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows the error when switching fails", async () => {
      const modeAction = vi.fn(
        async (_p: FormState, _d: FormData): Promise<FormState> => ({
          status: "error",
          message: "No se pudo guardar.",
        }),
      );
      renderPanel({ modeAction });
      fireEvent.click(screen.getByRole("button", { name: "Propio" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    });
  });

  describe("custom mode", () => {
    it("shows Propio as the active tab and switches back to Global", async () => {
      const modeAction = vi.fn(idle);
      renderPanel({ mode: "custom", modeAction });
      const group = screen.getByRole("group", { name: "Modo de precios" });
      const global = within(group).getByRole("button", { name: "Global" });
      expect(within(group).getByRole("button", { name: "Propio" })).toHaveTextContent("Activo");
      expect(global).toHaveTextContent("Inactivo");
      fireEvent.click(global);
      await waitFor(() => expect(modeAction).toHaveBeenCalled());
      expect(sentForm(modeAction).get("mode")).toBe("global");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows an editable form with the lot's values and no link to Parámetros", () => {
      renderPanel({ mode: "custom" });
      expect(screen.getByLabelText("TC del lote (₲ / US$)")).toHaveValue(7400);
      expect(screen.getByLabelText("Factor de venta")).toHaveValue(2.5);
      expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
      expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(55);
      expect(screen.getByRole("button", { name: "Guardar y recalcular" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Editar en Parámetros" })).not.toBeInTheDocument();
    });

    it("flags only the values that differ from the global ones", () => {
      renderPanel({ mode: "custom" });
      const flags = screen.getAllByText(/Difiere del global/);
      expect(flags).toHaveLength(1);
      expect(flags[0]).toHaveTextContent("Difiere del global (100)");
    });

    it("updates the flags as the values are typed", () => {
      renderPanel({ mode: "custom" });
      fireEvent.change(screen.getByLabelText("TC del lote (₲ / US$)"), {
        target: { value: "7500" },
      });
      expect(screen.getAllByText(/Difiere del global/)).toHaveLength(2);
      fireEvent.change(screen.getByLabelText("Costo sobre valor original (%)"), {
        target: { value: "100" },
      });
      const flags = screen.getAllByText(/Difiere del global/);
      expect(flags).toHaveLength(1);
      expect(flags[0]).toHaveTextContent("Difiere del global (7.400)");
    });

    it("submits the four values and shows the result", async () => {
      const paramsAction = vi.fn(
        async (_p: FormState, _d: FormData): Promise<FormState> => ({
          status: "success",
          message: "Parámetros propios guardados. Se recalcularon 4 precios.",
        }),
      );
      renderPanel({ mode: "custom", paramsAction });
      fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
      fireEvent.submit(
        screen
          .getByRole("button", { name: "Guardar y recalcular" })
          .closest("form") as HTMLFormElement,
      );
      expect(await screen.findByRole("status")).toHaveTextContent("Se recalcularon 4 precios");
      const data = sentForm(paramsAction);
      expect(data.get("exchangeRate")).toBe("7400");
      expect(data.get("saleFactor")).toBe("2.5");
      expect(data.get("vatPercent")).toBe("5");
      expect(data.get("costPercent")).toBe("55");
    });

    it("shows field errors", async () => {
      const paramsAction: Action = async () => ({
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: { vatPercent: "El IVA no puede superar 100." },
        values: { vatPercent: "250" },
      });
      renderPanel({ mode: "custom", paramsAction });
      fireEvent.submit(
        screen
          .getByRole("button", { name: "Guardar y recalcular" })
          .closest("form") as HTMLFormElement,
      );
      expect(await screen.findByText("El IVA no puede superar 100.")).toBeInTheDocument();
      expect(screen.getByLabelText("IVA (%)")).toHaveAttribute("aria-invalid", "true");
    });
  });
});
