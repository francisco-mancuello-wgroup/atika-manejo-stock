import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { SellableProduct } from "../lib/queries/sales";
import { SaleForm } from "./sale-form";

const products: SellableProduct[] = [
  {
    id: "p1",
    label: "Vestido Lino · Casa Icona",
    priceGs: 1_000_000,
    discountPercent: null,
    discountedPriceGs: null,
    sizes: [
      { size: "S", stock: 1 },
      { size: "M", stock: 4 },
    ],
  },
  {
    id: "p2",
    label: "Pantalón · Milonga",
    priceGs: 400_000,
    discountPercent: null,
    discountedPriceGs: null,
    sizes: [{ size: "U", stock: 5 }],
  },
  {
    id: "p3",
    label: "Blusa · Milonga",
    priceGs: 500_000,
    discountPercent: 20,
    discountedPriceGs: 400_000,
    sizes: [{ size: "M", stock: 2 }],
  },
];

const idle = async (): Promise<FormState> => ({ status: "idle" });

describe("SaleForm", () => {
  it("lists the products and defaults the date to today", () => {
    render(<SaleForm products={products} today="2026-10-21" action={idle} />);
    expect(screen.getByRole("option", { name: "Vestido Lino · Casa Icona" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-10-21");
    expect(screen.getByLabelText("Cantidad")).toHaveValue(1);
  });

  it("only offers the sizes of the chosen product, with their stock", () => {
    render(<SaleForm products={products} today="2026-10-21" action={idle} />);
    expect(screen.getByLabelText("Talle")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p1" } });
    expect(screen.getByLabelText("Talle")).toBeEnabled();
    expect(screen.getByRole("option", { name: "S (1 en stock)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "M (4 en stock)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /U \(/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p2" } });
    expect(screen.queryByRole("option", { name: "M (4 en stock)" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "U (5 en stock)" })).toBeInTheDocument();
  });

  it("limits the quantity to the stock of the chosen size and shows the list price", () => {
    render(<SaleForm products={products} today="2026-10-21" action={idle} />);
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Talle"), { target: { value: "M" } });
    expect(screen.getByLabelText("Cantidad")).toHaveAttribute("max", "4");
    expect(screen.getByText("Precio de lista: ₲ 1.000.000")).toBeInTheDocument();
  });

  it("suggests the discounted price with its percent and the original price", () => {
    render(<SaleForm products={products} today="2026-10-21" action={idle} />);
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p3" } });
    expect(
      screen.getByText("Precio de lista: ₲ 400.000 (-20 %), antes ₲ 500.000"),
    ).toBeInTheDocument();
  });

  it("submits the fields and shows the success message", async () => {
    const action = vi.fn(
      async (_prev: FormState, _data: FormData): Promise<FormState> => ({
        status: "success",
        message: "Venta registrada. Quedan 3 en talle M.",
      }),
    );
    render(<SaleForm products={products} today="2026-10-21" action={action} />);
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Talle"), { target: { value: "M" } });
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "Ana" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Registrar venta" }).closest("form") as HTMLFormElement,
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Venta registrada.");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("productId")).toBe("p1");
    expect(data.get("size")).toBe("M");
    expect(data.get("quantity")).toBe("1");
    expect(data.get("customer")).toBe("Ana");
  });

  it("shows the out of stock error as an alert", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "No hay stock suficiente en el talle M: queda 1 unidad.",
    });
    render(<SaleForm products={products} today="2026-10-21" action={action} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Registrar venta" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay stock suficiente");
  });
});
