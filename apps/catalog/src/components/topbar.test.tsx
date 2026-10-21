import { render, screen, within } from "@testing-library/react";
import { Topbar } from "./topbar";

describe("Topbar", () => {
  it("renders the atika logo", () => {
    render(<Topbar />);
    expect(screen.getByText("atika")).toBeInTheDocument();
  });

  it("lists the catalog categories in order", () => {
    render(<Topbar />);
    const nav = screen.getByRole("navigation", { name: "Categorías" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Novedades", "Vestidos", "Tops", "Faldas y shorts", "Accesorios"]);
  });

  it("offers a WhatsApp contact link styled with the whatsapp variant", () => {
    render(<Topbar />);
    const link = screen.getByRole("link", { name: "Escribinos" });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
    expect(link).toHaveClass("bg-wa");
  });
});
