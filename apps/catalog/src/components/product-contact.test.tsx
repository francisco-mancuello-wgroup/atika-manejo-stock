import { fireEvent, render, screen } from "@testing-library/react";
import type { CatalogSize } from "../lib/catalog-view";
import { ProductContact } from "./product-contact";

const sizes: CatalogSize[] = [
  { size: "S", available: true },
  { size: "M", available: true },
  { size: "L", available: false },
];
const props = {
  productName: "Vestido Lino",
  sizes,
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! {producto} talle {talle}",
};

const textOf = (link: HTMLElement) =>
  new URL(link.getAttribute("href") ?? "").searchParams.get("text");

describe("ProductContact", () => {
  it("lets the visitor pick an available size and marks it selected", () => {
    render(<ProductContact {...props} />);
    const m = screen.getByRole("button", { name: "M" });
    expect(m).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(m);
    expect(m).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "S" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows sold-out sizes struck through and not selectable", () => {
    render(<ProductContact {...props} />);
    const sold = screen.getByRole("button", { name: "L" });
    expect(sold).toBeDisabled();
    expect(sold).toHaveClass("line-through");
  });

  it("builds the WhatsApp link without a size until one is chosen", () => {
    render(<ProductContact {...props} />);
    const link = screen.getByRole("link", { name: "Consultar por WhatsApp" });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/595981123456\?text=/);
    expect(textOf(link)).toBe("Hola! Vestido Lino");
    fireEvent.click(screen.getByRole("button", { name: "S" }));
    expect(textOf(screen.getByRole("link", { name: "Consultar por WhatsApp" }))).toBe(
      "Hola! Vestido Lino talle S",
    );
  });

  it("lets the visitor unselect the size", () => {
    render(<ProductContact {...props} />);
    const s = screen.getByRole("button", { name: "S" });
    fireEvent.click(s);
    fireEvent.click(s);
    expect(s).toHaveAttribute("aria-pressed", "false");
    expect(textOf(screen.getByRole("link", { name: "Consultar por WhatsApp" }))).toBe(
      "Hola! Vestido Lino",
    );
  });

  it("opens WhatsApp in a new tab with the whatsapp button style", () => {
    render(<ProductContact {...props} />);
    const link = screen.getByRole("link", { name: "Consultar por WhatsApp" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("bg-wa", "rounded-none");
  });
});
