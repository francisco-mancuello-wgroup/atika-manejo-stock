import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));
vi.mock("../app/login/actions", () => ({ logoutAction: vi.fn() }));

describe("Sidebar", () => {
  it("shows the signed-in email with a Salir button", () => {
    render(<Sidebar email="dueña@atika.test" />);
    expect(screen.getByText("dueña@atika.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
  });

  it("hides the account block without a session email", () => {
    render(<Sidebar />);
    expect(screen.queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
  });

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

  it("shows the exchange rate of the day with a serif figure", () => {
    render(<Sidebar exchangeRate={7450} />);
    expect(screen.getByText("TC DEL DÍA")).toBeInTheDocument();
    expect(screen.getByText("₲ 7.450 / US$")).toHaveClass("font-display");
  });

  it("shows a dash when the exchange rate is unavailable", () => {
    render(<Sidebar />);
    expect(screen.getByText("₲ – / US$")).toBeInTheDocument();
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
      "Descuentos",
      "Parámetros",
      "Seguridad",
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
