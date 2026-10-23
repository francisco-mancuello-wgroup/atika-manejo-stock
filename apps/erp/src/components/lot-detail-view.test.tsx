import { render, screen } from "@testing-library/react";
import type { LotDetail } from "../lib/view-models";
import { LotDetailView } from "./lot-detail-view";

const lot: LotDetail = {
  id: "lot-1",
  name: "Lote Uno",
  supplier: "Proveedor",
  purchasedAt: "2026-05-01",
  pricingMode: "global",
  params: {
    exchangeRate: 7400,
    saleFactor: 2.5,
    vatPercent: 10,
    costPercent: 55,
    totalShippingUsd: 320.5,
  },
  sizes: [],
  rows: [],
  summary: {
    id: "lot-1",
    name: "Lote Uno",
    supplier: "Proveedor",
    purchasedAt: "2026-05-01",
    exchangeRate: 7400,
    products: 0,
    stock: 0,
    unitsBought: 0,
    unitsSold: 0,
    investmentGs: 0,
    investmentUsd: 0,
    stockValueGs: 0,
  },
};

const settings = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 100 };
const idle = async () => ({ status: "idle" as const });

function renderView(detail: LotDetail = lot) {
  render(
    <LotDetailView
      lot={detail}
      settings={settings}
      action={idle}
      paramsAction={idle}
      modeAction={idle}
    />,
  );
}

describe("LotDetailView", () => {
  it("shows the pricing values read-only with a link to Parámetros while the lot is global", () => {
    renderView();
    const pricing = screen.getByRole("region", { name: "Precios de la marca" });
    expect(pricing).toHaveTextContent("2,5");
    expect(pricing).toHaveTextContent("55");
    expect(screen.queryByRole("button", { name: "Guardar y recalcular" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar en Parámetros" })).toHaveAttribute(
      "href",
      "/parametros",
    );
  });

  it("offers the editable pricing form when the lot has its own parameters", () => {
    renderView({ ...lot, pricingMode: "custom" });
    expect(screen.getByRole("button", { name: "Guardar y recalcular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Propio" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers the shipping form", () => {
    renderView();
    expect(screen.getByLabelText("Envío total (US$)")).toHaveValue(320.5);
    expect(screen.getByRole("button", { name: "Guardar envío" })).toBeInTheDocument();
  });
});
