import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

describe("Sidebar", () => {
  it("renders the átika logo with the CASA ICONA eyebrow", () => {
    render(<Sidebar />);
    expect(screen.getByRole("img", { name: "átika" })).toBeInTheDocument();
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

  it("marks the section of the current URL when no active section is given", () => {
    vi.mocked(usePathname).mockReturnValue("/ventas");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Ventas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the section marked on nested pages", () => {
    vi.mocked(usePathname).mockReturnValue("/compras/casa-icona");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Compras" })).toHaveAttribute("aria-current", "page");
  });
});
