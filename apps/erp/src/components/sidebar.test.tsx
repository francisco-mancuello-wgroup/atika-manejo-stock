import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("renders the atika logo", () => {
    render(<Sidebar />);
    expect(screen.getByText("atika")).toBeInTheDocument();
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
