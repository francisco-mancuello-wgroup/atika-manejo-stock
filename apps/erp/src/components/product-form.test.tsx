import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { formatGs, formatUsd } from "../lib/format";
import { previewPrice } from "../lib/products/preview";
import { type LotContext, ProductForm, type ProductFormInitial } from "./product-form";

const params = {
  exchangeRate: 7000,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 0.5,
  totalShippingUsd: 20,
};
const lots: LotContext[] = [
  { id: "lot-1", name: "Lote Uno", params, otherUnits: 4 },
  { id: "lot-2", name: "Lote Dos", params: { ...params, totalShippingUsd: 0 }, otherUnits: 10 },
];
const initial: ProductFormInitial = {
  name: "Vestido Lino",
  code: "V-1",
  brand: "Casa",
  color: "Lila",
  category: "vestidos",
  description: "Lino",
  originalValueUsd: "100",
  sizes: [{ size: "M", unitsBought: "2", stock: "1" }],
};
const photos = [
  { id: "img-1", url: "/media/products/a.webp" },
  { id: "img-2", url: "/media/products/b.webp" },
];
const idle = async (): Promise<FormState> => ({ status: "idle" });

const expectedPrice = (original: number, units: number, otherUnits = 4) => {
  const preview = previewPrice({ params, otherUnits, units, originalValueUsd: original });
  return {
    cost: formatUsd(preview?.unitCostUsd ?? 0),
    price: formatGs(preview?.priceGs ?? 0),
  };
};

describe("ProductForm (edit)", () => {
  it("blocks saving photos that together do not fit in one upload", async () => {
    render(
      <ProductForm
        mode="edit"
        lots={[lots[0] as LotContext]}
        lotId="lot-1"
        initial={initial}
        photos={photos}
        action={idle}
      />,
    );
    const big = (name: string) =>
      new File([new Uint8Array(3 * 1024 * 1024)], name, { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Agregar fotos"), {
      target: { files: [big("a.jpg"), big("b.jpg")] },
    });
    expect(
      await screen.findByText("Las fotos pesan demasiado juntas: subí menos por vez."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("lets a photo batch that fits be saved", async () => {
    render(
      <ProductForm
        mode="edit"
        lots={[lots[0] as LotContext]}
        lotId="lot-1"
        initial={initial}
        photos={photos}
        action={idle}
      />,
    );
    fireEvent.change(screen.getByLabelText("Agregar fotos"), {
      target: { files: [new File([new Uint8Array(1000)], "a.jpg", { type: "image/jpeg" })] },
    });
    expect(await screen.findByText("a.jpg")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled());
  });

  const renderEdit = (action: (p: FormState, d: FormData) => Promise<FormState> = idle) =>
    render(
      <ProductForm
        mode="edit"
        lots={[lots[0] as LotContext]}
        lotId="lot-1"
        initial={initial}
        photos={photos}
        action={action}
      />,
    );

  it("shows every editable field with its current value", () => {
    renderEdit();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Vestido Lino");
    expect(screen.getByLabelText("Código")).toHaveValue("V-1");
    expect(screen.getByLabelText("Marca")).toHaveValue("Casa");
    expect(screen.getByLabelText("Color")).toHaveValue("Lila");
    expect(screen.getByLabelText("Categoría")).toHaveValue("vestidos");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Lino");
    expect(screen.getByLabelText("Valor original US$")).toHaveValue("100");
    expect(screen.getByText("Lote Uno")).toBeInTheDocument();
  });

  it("has only Guardar and Cancelar, no formula or extra actions", () => {
    renderEdit();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/inventario");
    expect(screen.queryByText(/Usar la fórmula/)).not.toBeInTheDocument();
    expect(screen.queryByText(/precio fijo/i)).not.toBeInTheDocument();
  });

  it("computes read-only cost and price live from the original value", () => {
    renderEdit();
    const initialPrice = expectedPrice(100, 2);
    expect(screen.getByLabelText("Costo u. (US$)")).toHaveValue(initialPrice.cost);
    expect(screen.getByLabelText("Precio (₲)")).toHaveValue(initialPrice.price);

    fireEvent.change(screen.getByLabelText("Valor original US$"), { target: { value: "200,5" } });
    const next = expectedPrice(200.5, 2);
    expect(screen.getByLabelText("Costo u. (US$)")).toHaveValue(next.cost);
    expect(screen.getByLabelText("Precio (₲)")).toHaveValue(next.price);
    expect(next.price).not.toBe(initialPrice.price);
  });

  it("recomputes when the units bought change (shipping is prorated)", () => {
    renderEdit();
    fireEvent.change(screen.getByLabelText("Unidades compradas talle M"), {
      target: { value: "6" },
    });
    expect(screen.getByLabelText("Precio (₲)")).toHaveValue(expectedPrice(100, 6).price);
  });

  it("adds and removes size rows", () => {
    renderEdit();
    expect(screen.queryByRole("button", { name: "Quitar talle M" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Agregar talle" }));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Talle fila 2"), { target: { value: "L" } });
    fireEvent.click(screen.getByRole("button", { name: "Quitar talle L" }));
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(1);
  });

  it("lists the photos with cover radio and remove checkbox, cover first", () => {
    renderEdit();
    const radios = screen.getAllByRole("radio", { name: /Portada/ });
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).toHaveAttribute("value", "img-2");
    expect(screen.getAllByRole("checkbox", { name: /Quitar foto/ })[1]).toHaveAttribute(
      "name",
      "removePhoto",
    );
    expect(screen.getByLabelText("Agregar fotos")).toHaveAttribute(
      "accept",
      expect.stringContaining("image/webp"),
    );
  });

  it("submits the typed values, the size rows and the chosen cover", async () => {
    const action = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Guardado. Nuevo precio: X.",
      }),
    );
    renderEdit(action);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Vestido Nuevo" } });
    fireEvent.click(screen.getAllByRole("radio", { name: /Portada/ })[1] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Guardado. Nuevo precio");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("name")).toBe("Vestido Nuevo");
    expect(data.get("originalValueUsd")).toBe("100");
    expect(data.get("sizes.0.size")).toBe("M");
    expect(data.get("sizes.0.unitsBought")).toBe("2");
    expect(data.get("sizes.0.stock")).toBe("1");
    expect(data.get("cover")).toBe("img-2");
  });

  it("shows field and row errors and keeps what was typed", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: {
        name: "Ingresá el nombre.",
        "sizes.0.stock": "El stock no puede superar las unidades compradas.",
      },
    });
    renderEdit(action);
    fireEvent.change(screen.getByLabelText("Valor original US$"), { target: { value: "77" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Ingresá el nombre.")).toBeInTheDocument();
    expect(
      screen.getByText("El stock no puede superar las unidades compradas."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Valor original US$")).toHaveValue("77");
  });
});

describe("ProductForm (new)", () => {
  const renderNew = () => render(<ProductForm mode="new" lots={lots} action={idle} />);

  it("asks for a lot and has one empty size row", () => {
    renderNew();
    const select = screen.getByLabelText("Lote");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Elegí un lote", "Lote Uno", "Lote Dos"]);
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/inventario");
  });

  it("prices with the chosen lot parameters and units", async () => {
    renderNew();
    expect(screen.getByLabelText("Precio (₲)")).toHaveValue("–");
    fireEvent.change(screen.getByLabelText("Lote"), { target: { value: "lot-1" } });
    fireEvent.change(screen.getByLabelText("Valor original US$"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Unidades compradas fila 1"), {
      target: { value: "2" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Precio (₲)")).toHaveValue(expectedPrice(100, 2).price),
    );
  });
});
