import { render, screen } from "@testing-library/react";
import { LabelPrinter } from "./label-printer";

const sizes = [
  { size: "S", barcode: "AT000001", stock: 2 },
  { size: "M", barcode: "AT000002", stock: 0 },
];

describe("LabelPrinter", () => {
  it("lists each size with its barcode", () => {
    render(<LabelPrinter productId="p1" sizes={sizes} />);
    expect(screen.getByText("AT000001")).toBeInTheDocument();
    expect(screen.getByText("AT000002")).toBeInTheDocument();
  });

  it("defaults the copies of each size to its current stock, editable down to zero", () => {
    render(<LabelPrinter productId="p1" sizes={sizes} />);
    const s = screen.getByLabelText("Copias talle S") as HTMLInputElement;
    const m = screen.getByLabelText("Copias talle M") as HTMLInputElement;
    expect(s.value).toBe("2");
    expect(m.value).toBe("0");
    expect(s).toHaveAttribute("name", "copies-S");
    expect(s).toHaveAttribute("min", "0");
    expect(s).toHaveAttribute("type", "number");
  });

  it("downloads from the labels route of the product with a GET form", () => {
    render(<LabelPrinter productId="p1" sizes={sizes} />);
    const form = screen.getByRole("button", { name: "Imprimir etiquetas" }).closest("form");
    expect(form).toHaveAttribute("action", "/inventario/p1/etiquetas");
    expect(form).toHaveAttribute("method", "get");
  });
});
