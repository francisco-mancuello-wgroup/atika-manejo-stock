import { fireEvent, render, screen } from "@testing-library/react";
import { formatGs } from "../lib/format";
import { SizePicker } from "./size-picker";

const base = {
  name: "COSTA VINO",
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?",
  colorLabel: "Vino",
  priceGs: 1_879_000,
  link: "https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-2",
};
const sizes = [
  { size: "XS", available: true },
  { size: "S", available: true },
  { size: "M", available: false },
];

describe("SizePicker", () => {
  it("offers the sizes as radios in a labelled group; sold-out sizes are disabled", () => {
    render(<SizePicker {...base} sizes={sizes} />);
    const group = screen.getByRole("radiogroup", { name: "Talle" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "XS" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "M" })).toBeDisabled();
  });

  it("asks to choose a size first: the button is disabled and focuses the sizes when pressed", () => {
    render(<SizePicker {...base} sizes={sizes} />);
    const button = screen.getByRole("button", { name: "Elegí tu talle" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole("radio", { name: "XS" })).toHaveFocus();
  });

  it("names the discount next to the price it is given", () => {
    render(<SizePicker {...base} priceGs={1_503_000} discountPercent={20} sizes={sizes} />);
    fireEvent.click(screen.getByRole("radio", { name: "S" }));
    const url = new URL(
      screen.getByRole("link", { name: "Realizar pedido" }).getAttribute("href") ?? "",
    );
    expect(url.searchParams.get("text")).toBe(
      `Hola! Me interesa COSTA VINO en talle S. ¿Está disponible? – Vino – ${formatGs(1_503_000)} (-20 %) – ${base.link}`,
    );
  });

  it("after choosing a size becomes a WhatsApp link with the full message", () => {
    render(<SizePicker {...base} sizes={sizes} />);
    fireEvent.click(screen.getByRole("radio", { name: "S" }));
    expect(screen.getByRole("radio", { name: "S" })).toBeChecked();
    const link = screen.getByRole("link", { name: "Realizar pedido" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe("https://wa.me/595981123456");
    expect(url.searchParams.get("text")).toBe(
      `Hola! Me interesa COSTA VINO en talle S. ¿Está disponible? – Vino – ₲ 1.879.000 – ${base.link}`,
    );
    expect(screen.queryByRole("button", { name: "Elegí tu talle" })).toBeNull();
  });

  it("follows the choice when another size is picked", () => {
    render(<SizePicker {...base} sizes={sizes} />);
    fireEvent.click(screen.getByRole("radio", { name: "S" }));
    fireEvent.click(screen.getByRole("radio", { name: "XS" }));
    expect(screen.getByRole("link", { name: "Realizar pedido" })).toBeInTheDocument();
  });

  it("preselects the only size (one-size pieces)", () => {
    render(<SizePicker {...base} sizes={[{ size: "U", available: true }]} />);
    expect(screen.getByRole("radio", { name: "U" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Realizar pedido" })).toBeInTheDocument();
  });

  it("preselects the only available size even among sold-out ones", () => {
    render(
      <SizePicker
        {...base}
        sizes={[
          { size: "S", available: false },
          { size: "M", available: true },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "M" })).toBeChecked();
  });

  it("omits price and color from the message when unknown", () => {
    render(
      <SizePicker
        {...base}
        colorLabel={null}
        priceGs={null}
        sizes={[{ size: "U", available: true }]}
      />,
    );
    const url = new URL(screen.getByRole("link").getAttribute("href") ?? "");
    expect(url.searchParams.get("text")).toBe(
      `Hola! Me interesa COSTA VINO en talle U. ¿Está disponible? – ${base.link}`,
    );
  });

  it("has nothing to consult when no size can be bought", () => {
    render(<SizePicker {...base} sizes={[]} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Sin talles disponibles" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
