import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { SellableProduct } from "../lib/queries/sales";
import { SaleForm } from "./sale-form";

function product(overrides: Partial<SellableProduct> & Pick<SellableProduct, "id" | "name">) {
  return {
    label: overrides.name,
    catalogName: null,
    color: null,
    code: null,
    brand: null,
    lotName: "Lote",
    priceGs: 400_000,
    discountPercent: null,
    discountedPriceGs: null,
    sizes: [{ size: "U", stock: 5, barcode: "AT000099" }],
    ...overrides,
  } satisfies SellableProduct;
}

const products: SellableProduct[] = [
  product({
    id: "p1",
    name: "Vestido Lino",
    label: "Vestido Lino · Crudo · V-1",
    color: "Crudo",
    code: "V-1",
    lotName: "Casa Icona",
    priceGs: 1_000_000,
    sizes: [
      { size: "S", stock: 1, barcode: "AT000001" },
      { size: "M", stock: 4, barcode: "AT000002" },
    ],
  }),
  product({
    id: "p2",
    name: "Bot Amar A",
    label: "Bot Amar A · Amarillo · B-1",
    color: "Amarillo",
    code: "B-1",
    brand: "Milonga",
    sizes: [{ size: "U", stock: 5, barcode: "AT000010" }],
  }),
  product({
    id: "p3",
    name: "Bot Amar A",
    label: "Bot Amar A · Rojo · B-2",
    color: "Rojo",
    code: "B-2",
    brand: "Milonga",
    priceGs: 500_000,
    discountPercent: 20,
    discountedPriceGs: 400_000,
    sizes: [{ size: "M", stock: 2, barcode: "AT000020" }],
  }),
];

const idle = async (): Promise<FormState> => ({ status: "idle" });

function renderForm(action: (p: FormState, d: FormData) => Promise<FormState> = idle) {
  return render(<SaleForm products={products} today="2026-10-21" action={action} />);
}

function search() {
  return screen.getByRole("combobox", { name: "Producto" });
}

function choose(text: string, optionName: RegExp | string) {
  fireEvent.change(search(), { target: { value: text } });
  fireEvent.click(screen.getByRole("option", { name: optionName }));
}

describe("SaleForm", () => {
  it("defaults the date to today and starts without a product", () => {
    renderForm();
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-10-21");
    expect(screen.getByLabelText("Cantidad")).toHaveValue(1);
    expect(screen.getByLabelText("Talle")).toBeDisabled();
  });

  it("narrows the listbox as you type and disambiguates repeated names", () => {
    renderForm();
    fireEvent.change(search(), { target: { value: "bot amar" } });
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Amarillo");
    expect(options[1]).toHaveTextContent("Rojo");

    fireEvent.change(search(), { target: { value: "rojo" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    fireEvent.change(search(), { target: { value: "zzz" } });
    expect(within(screen.getByRole("listbox")).queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("selects the product on click and keeps a hidden productId", () => {
    const { container } = renderForm();
    choose("vestido", /Vestido Lino/);
    expect(container.querySelector<HTMLInputElement>('input[name="productId"]')?.value).toBe("p1");
    expect(search()).toHaveValue("Vestido Lino · Crudo · V-1");
    expect(screen.getByLabelText("Talle")).toBeEnabled();
  });

  it("supports arrow keys, Enter and Escape without submitting the form", () => {
    const action = vi.fn(idle);
    const { container } = renderForm(action);
    fireEvent.change(search(), { target: { value: "bot amar" } });
    expect(search()).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(search(), { key: "ArrowDown" });
    fireEvent.keyDown(search(), { key: "ArrowDown" });
    expect(search()).toHaveAttribute(
      "aria-activedescendant",
      within(screen.getByRole("listbox")).getAllByRole("option")[1]?.id as string,
    );
    const enter = fireEvent.keyDown(search(), { key: "Enter" });
    expect(enter).toBe(false); // default prevented: no implicit form submit
    expect(container.querySelector<HTMLInputElement>('input[name="productId"]')?.value).toBe("p3");
    expect(action).not.toHaveBeenCalled();

    fireEvent.change(search(), { target: { value: "vest" } });
    fireEvent.keyDown(search(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("selects product and size when an exact size barcode is typed", () => {
    const { container } = renderForm();
    fireEvent.change(search(), { target: { value: " at000002 " } });
    expect(container.querySelector<HTMLInputElement>('input[name="productId"]')?.value).toBe("p1");
    expect(screen.getByLabelText("Talle")).toHaveValue("M");
  });

  it("does not submit when a scanner presses Enter after the barcode", () => {
    const action = vi.fn(idle);
    renderForm(action);
    fireEvent.change(search(), { target: { value: "AT000020" } });
    const enter = fireEvent.keyDown(search(), { key: "Enter" });
    expect(enter).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Talle")).toHaveValue("M");
  });

  it("only offers the sizes of the chosen product, with their stock", () => {
    renderForm();
    choose("vestido", /Vestido Lino/);
    expect(screen.getByRole("option", { name: "S (1 en stock)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "M (4 en stock)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /U \(/ })).not.toBeInTheDocument();
  });

  it("limits the quantity to the stock of the chosen size and shows the list price", () => {
    renderForm();
    choose("vestido", /Vestido Lino/);
    fireEvent.change(screen.getByLabelText("Talle"), { target: { value: "M" } });
    expect(screen.getByLabelText("Cantidad")).toHaveAttribute("max", "4");
    expect(screen.getByText("Precio de lista: ₲ 1.000.000")).toBeInTheDocument();
  });

  it("suggests the discounted price with its percent and the original price", () => {
    renderForm();
    choose("rojo", /Rojo/);
    expect(
      screen.getByText("Precio de lista: ₲ 400.000 (-20 %), antes ₲ 500.000"),
    ).toBeInTheDocument();
  });

  it("submits the fields and resets after success", async () => {
    const action = vi.fn(
      async (_prev: FormState, _data: FormData): Promise<FormState> => ({
        status: "success",
        message: "Venta registrada. Quedan 3 en talle M.",
      }),
    );
    renderForm(action);
    choose("vestido", /Vestido Lino/);
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
    expect(search()).toHaveValue("");
  });

  it("shows the out of stock error as an alert", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "No hay stock suficiente en el talle M: queda 1 unidad.",
    });
    renderForm(action);
    fireEvent.submit(
      screen.getByRole("button", { name: "Registrar venta" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay stock suficiente");
  });
});
