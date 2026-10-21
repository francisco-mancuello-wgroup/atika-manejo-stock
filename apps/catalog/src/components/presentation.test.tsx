import { render, screen, within } from "@testing-library/react";
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
      sizes: [{ size: "U", available: true }],
      photos: [],
      color: null,
      description: null,
    },
  ],
};

describe("Presentation", () => {
  it("has a fixed top bar with the way back and the collection name, and no site search", () => {
    render(<Presentation collection={collection} />);
    expect(screen.getByRole("link", { name: /Catálogos/ })).toHaveAttribute("href", "/");
    const bar = screen.getByRole("banner");
    expect(within(bar).getByText("Casa Icona")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("opens with a cover: wordmark, eyebrow, first photo, title and caption", () => {
    render(<Presentation collection={collection} />);
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
    render(<Presentation collection={collection} />);
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
    render(<Presentation collection={collection} />);
    const first = screen.getByRole("region", { name: "COSTA VINO" });
    expect(within(first).getByText("₲ 2.518.000")).toBeInTheDocument();
    expect(within(first).getByText("Prenda corta en tono vino")).toBeInTheDocument();
    expect(within(first).getByText("Vino")).toBeInTheDocument();
    expect(within(first).getByTestId("swatch")).toHaveStyle({ backgroundColor: "#6d1f2c" });
  });

  it("asks to consult the price, and shows neither color nor description when unknown", () => {
    render(<Presentation collection={collection} />);
    const second = screen.getByRole("region", { name: "NINA" });
    expect(within(second).getByText("Consultar precio")).toBeInTheDocument();
    expect(within(second).queryByTestId("swatch")).toBeNull();
  });

  it("lists the sizes of the piece", () => {
    render(<Presentation collection={collection} />);
    const first = screen.getByRole("region", { name: "COSTA VINO" });
    const sizes = within(first).getByRole("group", { name: "Talle" });
    expect(within(sizes).getAllByText(/^(XS|S)$/)).toHaveLength(2);
  });
});
