import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { type BookCatalog, CatalogShelf } from "./book";

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
    render(<CatalogShelf catalogs={catalogs} />);
    expect(screen.getByRole("heading", { name: "Pink" })).toBeInTheDocument();
    expect(screen.queryByText(/evento/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver selección Pink" })).toHaveAttribute(
      "href",
      "/catalogos/pink",
    );
  });

  it("still lists every catalog with Ver todo", () => {
    render(<CatalogShelf catalogs={catalogs} />);
    expect(screen.getByRole("heading", { name: "Catálogos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todo" })).toHaveAttribute("href", "#casa-icona");
    expect(screen.getAllByText("Ver catálogo")).toHaveLength(2);
  });
});
