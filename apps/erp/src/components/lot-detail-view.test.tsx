import { render, screen } from "@testing-library/react";
import type { LotDetail } from "../lib/view-models";
import { LotDetailView } from "./lot-detail-view";

const lot: LotDetail = {
  id: "lot-1",
  name: "Lote Uno",
  supplier: "Proveedor",
  purchasedAt: "2026-05-01",
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

describe("LotDetailView", () => {
  it("shows the pricing values read-only with a link to Parámetros", () => {
    render(<LotDetailView lot={lot} action={async () => ({ status: "idle" })} />);
    expect(screen.queryByText("Parámetros del lote")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar y recalcular" })).not.toBeInTheDocument();
    const pricing = screen.getByRole("region", { name: "Precios del lote" });
    expect(pricing).toHaveTextContent("2,5");
    expect(pricing).toHaveTextContent("55");
    expect(screen.getByRole("link", { name: "Editar en Parámetros" })).toHaveAttribute(
      "href",
      "/parametros",
    );
  });

  it("offers the shipping form", () => {
    render(<LotDetailView lot={lot} action={async () => ({ status: "idle" })} />);
    expect(screen.getByLabelText("Envío total (US$)")).toHaveValue(320.5);
    expect(screen.getByRole("button", { name: "Guardar envío" })).toBeInTheDocument();
  });
});
