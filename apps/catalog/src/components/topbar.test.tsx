import { fireEvent, render, screen } from "@testing-library/react";
import { Topbar } from "./topbar";

let pathname = "/";
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  pathname = "/";
  search = "";
});

describe("Topbar", () => {
  it("renders the átika logo with the CASA ICONA eyebrow", () => {
    render(<Topbar />);
    expect(screen.getByRole("img", { name: "átika" })).toBeInTheDocument();
    expect(screen.getByText("CASA ICONA")).toBeInTheDocument();
  });

  it("no longer lists the categories (the page rail and tabs do)", () => {
    render(<Topbar />);
    expect(screen.queryByRole("navigation", { name: "Categorías" })).toBeNull();
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

describe("Topbar search", () => {
  it("is a GET form with a 'Buscar prenda' search box named q", () => {
    render(<Topbar />);
    const input = screen.getByRole("searchbox", { name: "Buscar prenda" });
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("placeholder", "Buscar prenda");
    const form = input.closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/ver-todo");
  });

  it("searches inside the current category and keeps size and sort", () => {
    pathname = "/ver-todo/vestidos";
    search = "talle=S&orden=precio-asc&p=abc&q=viejo";
    render(<Topbar />);
    const input = screen.getByRole("searchbox", { name: "Buscar prenda" });
    expect(input).toHaveValue("viejo");
    const form = input.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("action", "/ver-todo/vestidos");
    const hidden = Array.from(form.querySelectorAll("input[type=hidden]")).map(
      (field) => `${field.getAttribute("name")}=${field.getAttribute("value")}`,
    );
    expect(hidden).toEqual(["talle=S", "orden=precio-asc"]);
  });

  it("searches the whole catalog from pages that are not a category", () => {
    pathname = "/producto/123";
    render(<Topbar />);
    expect(screen.getByRole("searchbox").closest("form")).toHaveAttribute("action", "/ver-todo");
  });

  it("ignores invalid size and sort values in the URL", () => {
    pathname = "/ver-todo/tops";
    search = "talle=XXL&orden=azar";
    render(<Topbar />);
    expect(
      screen.getByRole("searchbox").closest("form")?.querySelectorAll("input[type=hidden]"),
    ).toHaveLength(0);
  });

  it("shows the search box from a toggle button on narrow screens", () => {
    render(<Topbar />);
    const toggle = screen.getByRole("button", { name: "Buscar" });
    const form = screen.getByRole("searchbox").closest("form");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(form).toHaveClass("hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(form).not.toHaveClass("hidden");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
