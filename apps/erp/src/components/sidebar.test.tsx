import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("renders the átika logo alone, without a brand eyebrow", () => {
    render(<Sidebar />);
    expect(screen.getByRole("img", { name: "átika" })).toBeInTheDocument();
    expect(screen.queryByText(/casa icona/i)).not.toBeInTheDocument();
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
      "Catálogo web",
      "Datos bancarios",
      "Parámetros",
      "Seguridad",
    ]);
    expect(within(nav).getByRole("button", { name: "Ventas" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Promos" })).toBeInTheDocument();
  });

  it("marks only the active section as the current page", () => {
    render(<Sidebar activeHref="/compras" />);
    expect(screen.getByRole("link", { name: "Compras" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
  });

  it("marks the section of the current URL when no active section is given", () => {
    vi.mocked(usePathname).mockReturnValue("/compras");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Compras" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
  });

  it("shows Ventas as a closed dropdown outside its pages and opens it to its two pages", () => {
    render(<Sidebar activeHref="/" />);
    const ventas = screen.getByRole("button", { name: "Ventas" });
    expect(ventas).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(ventas);
    expect(screen.getByRole("link", { name: "Registradas" })).toHaveAttribute("href", "/ventas");
    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute(
      "href",
      "/ventas/pedidos",
    );
  });

  it("starts Ventas open on its pages and marks only the one being viewed", () => {
    vi.mocked(usePathname).mockReturnValue("/ventas");
    const { unmount } = render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Ventas" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Registradas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Pedidos" })).not.toHaveAttribute("aria-current");
    unmount();

    vi.mocked(usePathname).mockReturnValue("/ventas/pedidos/o1");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Registradas" })).not.toHaveAttribute("aria-current");
  });

  it("shows Promos as a closed dropdown outside its pages", () => {
    render(<Sidebar activeHref="/" />);
    const promos = screen.getByRole("button", { name: "Promos" });
    expect(promos).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Descuentos" })).not.toBeInTheDocument();
  });

  it("starts with the phone menu closed behind a Menú button", () => {
    render(<Sidebar />);
    const toggle = screen.getByRole("button", { name: "Menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveClass("hidden", "md:flex");
    expect(
      within(panel as HTMLElement).getByRole("navigation", { name: "Principal" }),
    ).toBeInTheDocument();
  });

  it("opens the phone menu and closes it again", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    const close = screen.getByRole("button", { name: "Cerrar menú" });
    expect(close).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(close.getAttribute("aria-controls") ?? "");
    expect(panel).not.toHaveClass("hidden");

    fireEvent.click(close);
    expect(screen.getByRole("button", { name: "Menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the phone menu when a section is chosen", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    fireEvent.click(screen.getByRole("link", { name: "Inventario" }));
    expect(screen.getByRole("button", { name: "Menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens Promos to reveal Descuentos and Bancos", () => {
    render(<Sidebar activeHref="/" />);
    fireEvent.click(screen.getByRole("button", { name: "Promos" }));
    expect(screen.getByRole("button", { name: "Promos" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Descuentos" })).toHaveAttribute(
      "href",
      "/promos/descuentos",
    );
    expect(screen.getByRole("link", { name: "Bancos" })).toHaveAttribute("href", "/promos/bancos");

    fireEvent.click(screen.getByRole("button", { name: "Promos" }));
    expect(screen.queryByRole("link", { name: "Bancos" })).not.toBeInTheDocument();
  });

  it("starts Promos open and marks the option of a nested discount page", () => {
    vi.mocked(usePathname).mockReturnValue("/promos/descuentos/d1");
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Promos" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Descuentos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Bancos" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the section marked on nested pages", () => {
    vi.mocked(usePathname).mockReturnValue("/compras/casa-icona");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Compras" })).toHaveAttribute("aria-current", "page");
  });
});
