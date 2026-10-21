import { fireEvent, render, screen, within } from "@testing-library/react";
import type { PresentationCollection } from "../lib/presentation";
import { Presentation } from "./presentation";

const collection: PresentationCollection = {
  slug: "casa-icona",
  name: "Casa Icona",
  pieces: [
    {
      id: "1",
      name: "COSTA VINO",
      priceGs: 2_518_000,
      discountPercent: null,
      discountedPriceGs: null,
      sizes: [
        { size: "XS", available: true },
        { size: "S", available: true },
      ],
      photos: [
        { url: "/media/a.webp", alt: "COSTA VINO" },
        { url: "/media/b.webp", alt: "COSTA VINO" },
      ],
      color: { label: "Vino", hex: "#6d1f2c" },
      description: "Prenda corta en tono vino",
    },
    {
      id: "2",
      name: "NINA",
      priceGs: null,
      discountPercent: null,
      discountedPriceGs: null,
      sizes: [{ size: "U", available: true }],
      photos: [],
      color: null,
      description: null,
    },
  ],
};

const contact = {
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}.",
  origin: "https://catalogo.test",
};

describe("Presentation", () => {
  it("has a fixed top bar with the way back and the collection name, and no site search", () => {
    render(<Presentation collection={collection} {...contact} />);
    expect(screen.getByRole("link", { name: /Catálogos/ })).toHaveAttribute("href", "/");
    const bar = screen.getByRole("banner");
    expect(within(bar).getByText("Casa Icona")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("opens with a cover: wordmark, eyebrow, first photo, title and caption", () => {
    render(<Presentation collection={collection} {...contact} />);
    const cover = screen.getByRole("region", { name: "Portada" });
    expect(cover).toHaveAttribute("id", "casa-icona-portada");
    expect(within(cover).getByText("Casa Icona")).toBeInTheDocument();
    expect(
      within(cover).getByRole("heading", { level: 1, name: "Colección seleccionada" }),
    ).toHaveClass("font-display");
    expect(within(cover).getByRole("img", { name: "COSTA VINO" })).toHaveAttribute(
      "src",
      expect.stringContaining("a.webp"),
    );
    expect(within(cover).getByText("2 piezas · Deslizá para ver")).toBeInTheDocument();
  });

  it("renders one full-height section per piece with anchor ids, names and numbering", () => {
    render(<Presentation collection={collection} {...contact} />);
    const first = screen.getByRole("region", { name: "COSTA VINO" });
    expect(first).toHaveAttribute("id", "casa-icona-pagina-1");
    expect(first).toHaveClass("h-svh", "snap-start");
    expect(within(first).getByText("01 / 2")).toBeInTheDocument();
    expect(within(first).getByRole("heading", { level: 2, name: "COSTA VINO" })).toHaveClass(
      "font-display",
    );
    expect(within(first).getByText("Casa Icona · Colección seleccionada")).toBeInTheDocument();
    const second = screen.getByRole("region", { name: "NINA" });
    expect(second).toHaveAttribute("id", "casa-icona-pagina-2");
    expect(within(second).getByText("02 / 2")).toBeInTheDocument();
  });

  it("shows price, description and color with its swatch", () => {
    render(<Presentation collection={collection} {...contact} />);
    const first = screen.getByRole("region", { name: "COSTA VINO" });
    expect(within(first).getByText("₲ 2.518.000")).toBeInTheDocument();
    expect(within(first).getByText("Prenda corta en tono vino")).toBeInTheDocument();
    expect(within(first).getByText("Vino")).toBeInTheDocument();
    expect(within(first).getByTestId("swatch")).toHaveStyle({ backgroundColor: "#6d1f2c" });
  });

  it("shows the discount and sends the discounted price in the WhatsApp message", () => {
    const [first, second] = collection.pieces;
    const discounted = {
      ...collection,
      pieces: [
        { ...(first as never as object), discountPercent: 20, discountedPriceGs: 2_014_000 },
        second,
      ],
    } as PresentationCollection;
    render(<Presentation collection={discounted} {...contact} />);
    const section = screen.getByRole("region", { name: "COSTA VINO" });
    expect(within(section).getByText("₲ 2.518.000").tagName).toBe("S");
    expect(within(section).getByText("₲ 2.014.000")).toBeInTheDocument();
    expect(within(section).getByText("-20 %")).toBeInTheDocument();
    fireEvent.click(within(section).getByRole("radio", { name: "S" }));
    const href = within(section)
      .getByRole("link", { name: "Realizar pedido" })
      .getAttribute("href");
    const text = new URL(href ?? "").searchParams.get("text");
    expect(text).toContain("₲\u00a02.014.000 (-20 %)");
    expect(text).not.toContain("2.518.000");
  });

  it("asks to consult the price, and shows neither color nor description when unknown", () => {
    render(<Presentation collection={collection} {...contact} />);
    const second = screen.getByRole("region", { name: "NINA" });
    expect(within(second).getByText("Consultar precio")).toBeInTheDocument();
    expect(within(second).queryByTestId("swatch")).toBeNull();
  });

  it("offers the size picker and a WhatsApp consult that links to the piece anchor", () => {
    render(<Presentation collection={collection} {...contact} />);
    const first = screen.getByRole("region", { name: "COSTA VINO" });
    expect(within(first).getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(within(first).getByRole("radio", { name: "S" }));
    const href = within(first).getByRole("link", { name: "Realizar pedido" }).getAttribute("href");
    expect(new URL(href ?? "").searchParams.get("text")).toContain(
      "https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-1",
    );
    const second = screen.getByRole("region", { name: "NINA" });
    expect(within(second).getByRole("radio", { name: "U" })).toBeChecked();
    expect(
      new URL(
        within(second).getByRole("link", { name: "Realizar pedido" }).getAttribute("href") ?? "",
      ).searchParams.get("text"),
    ).toContain("casa-icona-pagina-2");
  });
});
