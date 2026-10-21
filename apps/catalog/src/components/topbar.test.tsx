import { render, screen, within } from "@testing-library/react";
import { Topbar } from "./topbar";

describe("Topbar", () => {
  it("renders the átika logo with the CASA ICONA eyebrow", () => {
    render(<Topbar />);
    expect(screen.getByRole("img", { name: "átika" })).toBeInTheDocument();
    expect(screen.getByText("CASA ICONA")).toBeInTheDocument();
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
    expect(link).toHaveAttribute("href", "https://wa.me/");
    expect(link).toHaveClass("bg-wa", "rounded-none");
  });

  it("points the contact link at the configured number", () => {
    render(<Topbar whatsappNumber="+595 981 123 456" />);
    expect(screen.getByRole("link", { name: "Escribinos" })).toHaveAttribute(
      "href",
      "https://wa.me/595981123456",
    );
  });
});
