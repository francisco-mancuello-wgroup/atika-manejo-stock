import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { type BookCatalog, CatalogShelf, LookbookBook } from "./book";

// Next's loader adds the blur preview to static imports; Vitest only sees a path
vi.mock("../../../public/atika/pink.jpg", () => ({
  default: { src: "/pink.jpg", width: 3, height: 4, blurDataURL: "data:image/jpeg;base64,AA==" },
}));

const cover = {
  src: "/cover.jpg",
  width: 3,
  height: 4,
  blurDataURL: "data:image/jpeg;base64,AA==",
};
const catalogs: BookCatalog[] = [
  { slug: "casa-icona", name: "Casa Icona", tagline: "Colección seleccionada", cover, pages: [] },
  { slug: "milonga", name: "Milonga", tagline: "Colección 2026", cover, pages: [] },
];

describe("CatalogShelf", () => {
  it("opens with Pink, linking to its selection", () => {
    render(<CatalogShelf catalogs={catalogs} pink />);
    expect(screen.getByRole("heading", { name: "Pink" })).toBeInTheDocument();
    expect(screen.queryByText(/evento/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver selección Pink" })).toHaveAttribute(
      "href",
      "/catalogos/pink",
    );
  });

  it("has no Pink banner when no group has pieces to show", () => {
    render(<CatalogShelf catalogs={catalogs} pink={false} />);
    expect(screen.queryByRole("heading", { name: "Pink" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver selección Pink" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Catálogos" })).toBeInTheDocument();
  });

  it("still lists every catalog with Ver todo", () => {
    render(<CatalogShelf catalogs={catalogs} pink={false} />);
    expect(screen.getByRole("heading", { name: "Catálogos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todo" })).toHaveAttribute("href", "#casa-icona");
    expect(screen.getAllByText("Ver catálogo")).toHaveLength(2);
  });
});

describe("LookbookBook bar", () => {
  it("on the home (with the shelf) shows only search, without Catálogos nor the title", () => {
    render(
      <LookbookBook
        title="Átika"
        catalogs={catalogs}
        origin=""
        pagePath="/"
        intro={<p>shelf</p>}
      />,
    );
    expect(screen.queryByRole("link", { name: /Catálogos/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Átika")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar prendas" })).toBeInTheDocument();
  });

  it("on a catalog page keeps Catálogos to go back home and the catalog name", () => {
    render(
      <LookbookBook title="Milonga" catalogs={catalogs} origin="" pagePath="/catalogos/milonga" />,
    );
    expect(screen.getByRole("link", { name: /Catálogos/ })).toHaveAttribute("href", "/");
    expect(screen.getByText("Milonga", { selector: "span" })).toBeInTheDocument();
  });
});

describe("brand covers", () => {
  const brand = (cover: BookCatalog["cover"]): BookCatalog[] => [
    { slug: "zeta", name: "Zeta", tagline: "Colección seleccionada", cover, pages: [] },
  ];

  it("renders an uploaded or product photo given by URL", () => {
    render(<CatalogShelf catalogs={brand("/media/brands/uploads/b/c.webp")} pink={false} />);
    const image = document.querySelector(
      "img[src*='media%2Fbrands%2Fuploads%2Fb%2Fc.webp'], img[src='/media/brands/uploads/b/c.webp']",
    );
    expect(image).not.toBeNull();
  });

  it("renders a brand without any photo without breaking", () => {
    render(<CatalogShelf catalogs={brand(null)} pink={false} />);
    expect(screen.getByRole("heading", { name: "Zeta" })).toBeInTheDocument();
    expect(document.querySelector('img[alt=""]')).toBeNull();
  });
});
