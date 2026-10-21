import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import HomePage from "./page";

vi.mock("../../lib/queries/summary", () => ({
  getResumen: async () => ({
    totals: {
      stock: 5,
      unitsSold: 1,
      unitsBought: 6,
      investmentUsd: 10,
      investmentGs: 70_000,
      stockValueGs: 100_000,
    },
    monthSalesGs: 0,
    lots: [],
    latestSales: [],
  }),
}));

describe("ERP home page", () => {
  it("renders the Resumen heading with data from the query", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByText("₲ 100.000")).toBeInTheDocument();
  });
});
