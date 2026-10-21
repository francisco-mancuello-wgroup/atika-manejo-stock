import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("renders the átika wordmark in the logo font with the CASA ICONA eyebrow", () => {
    render(<Sidebar />);
    expect(screen.getByText("átika")).toHaveClass("font-logo");
    expect(screen.getByText("CASA ICONA")).toBeInTheDocument();
  });

  it("marks Resumen as the current page by default", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Inventario" })).not.toHaveAttribute("aria-current");
  });

  it("shows the exchange rate footer with a serif figure", () => {
    render(<Sidebar />);
    expect(screen.getByText("TC DEL DÍA")).toBeInTheDocument();
    expect(screen.getByText("₲ 7.400 / US$")).toHaveClass("font-display");
  });

  it("lists the ERP sections in order inside a labelled navigation", () => {
    render(<Sidebar />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual([
      "Resumen",
      "Inventario",
      "Compras",
      "Ventas",
      "Catálogo web",
      "Parámetros",
    ]);
  });

  it("marks only the active section as the current page", () => {
    render(<Sidebar activeHref="/ventas" />);
    expect(screen.getByRole("link", { name: "Ventas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
  });
});
