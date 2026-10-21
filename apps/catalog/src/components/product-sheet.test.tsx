import { fireEvent, render, screen } from "@testing-library/react";
import type { CatalogProductDetail } from "../lib/catalog-view";
import { ProductSheet } from "./product-sheet";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const product: CatalogProductDetail = {
  id: "abc",
  name: "Vestido Lino",
  brand: "Casa Icona",
  category: "vestidos",
  priceGs: 450_000,
  discountPercent: null,
  discountedPriceGs: null,
  sizes: [
    { size: "S", available: true },
    { size: "M", available: true },
    { size: "L", available: false },
  ],
  inStock: true,
  imageUrl: "/media/products/a.webp",
  detail: "Verde · Lino fresco",
  color: "Verde",
  description: "Lino fresco con cierre lateral.",
  images: [
    { url: "/media/products/a.webp", alt: "Vestido Lino" },
    { url: "/media/products/b.webp", alt: "Vestido Lino" },
  ],
};

function renderSheet(overrides: Partial<CatalogProductDetail> = {}) {
  return render(
    <ProductSheet
      product={{ ...product, ...overrides }}
      whatsappNumber="+595 981 123 456"
      messageTemplate="Hola! {producto} talle {talle}"
      closeHref="/ver-todo/vestidos?talle=S"
    />,
  );
}

const textOf = (link: HTMLElement) =>
  new URL(link.getAttribute("href") ?? "").searchParams.get("text");

beforeEach(() => {
  replace.mockClear();
});

describe("ProductSheet", () => {
  it("is a modal dialog labelled by the product name", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog", { name: "Vestido Lino" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Vestido Lino" })).toHaveClass(
      "font-display",
    );
  });

  it("shows brand, price with the IVA note, color and description", () => {
    renderSheet();
    expect(screen.getByText("Casa Icona")).toHaveClass("uppercase", "text-muted");
    expect(screen.getByText(/450\.000/)).toHaveClass("font-display");
    expect(screen.getByText("IVA incluido")).toBeInTheDocument();
    expect(screen.getByText("Verde")).toBeInTheDocument();
    expect(screen.getByText("Lino fresco con cierre lateral.")).toBeInTheDocument();
  });

  it("shows the struck price, the discounted price and the badge, and sends the discounted price", () => {
    renderSheet({ discountPercent: 20, discountedPriceGs: 360_000 });
    expect(screen.getByText("₲ 450.000").tagName).toBe("S");
    expect(screen.getByText("₲ 360.000")).toBeInTheDocument();
    expect(screen.getByText("-20 %")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "S" }));
    expect(textOf(screen.getByRole("link", { name: "Realizar pedido" }))).toBe(
      "Hola! Vestido Lino talle S – ₲\u00a0360.000 (-20 %)",
    );
  });

  it("asks to consult the price when it is hidden", () => {
    renderSheet({ priceGs: null });
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
    expect(screen.queryByText("IVA incluido")).toBeNull();
  });

  it("lets the visitor pick an available size; sold-out ones are struck and disabled", () => {
    renderSheet();
    const m = screen.getByRole("button", { name: "M" });
    expect(m).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(m);
    expect(m).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(m);
    expect(m).toHaveAttribute("aria-pressed", "false");
    const sold = screen.getByRole("button", { name: "L" });
    expect(sold).toBeDisabled();
    expect(sold).toHaveClass("line-through");
  });

  it("links the full-width WhatsApp button, naming the size once one is chosen", () => {
    renderSheet();
    const without = screen.getByRole("link", { name: "Consultar por WhatsApp" });
    expect(without.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/595981123456\?text=/);
    expect(textOf(without)).toBe("Hola! Vestido Lino");
    expect(without).toHaveAttribute("target", "_blank");
    expect(without).toHaveClass("bg-wa", "w-full");

    fireEvent.click(screen.getByRole("button", { name: "S" }));
    const withSize = screen.getByRole("link", { name: "Realizar pedido" });
    expect(textOf(withSize)).toBe("Hola! Vestido Lino talle S");
  });

  it("shows the photo with the sand offset and switches it from the thumbnails", () => {
    renderSheet();
    const photo = () => screen.getAllByRole("img", { name: "Vestido Lino" })[0];
    expect(photo()?.getAttribute("src")).toContain(encodeURIComponent("/media/products/a.webp"));
    expect(photo()?.parentElement?.className).toContain("var(--color-sand)");
    const thumbs = screen.getAllByRole("button", { name: /Ver foto/ });
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(thumbs[1] as HTMLElement);
    expect(thumbs[1]).toHaveAttribute("aria-pressed", "true");
    expect(photo()?.getAttribute("src")).toContain(encodeURIComponent("/media/products/b.webp"));
  });

  it("omits the thumbnails with a single photo and keeps an empty placeholder without photos", () => {
    const { container, unmount } = renderSheet({ images: [product.images[0] as never] });
    expect(screen.queryAllByRole("button", { name: /Ver foto/ })).toHaveLength(0);
    unmount();
    const none = renderSheet({ images: [], imageUrl: null });
    expect(screen.queryByRole("img")).toBeNull();
    expect(none.container.querySelector(".bg-subtle")?.className).toContain("var(--color-sand)");
    expect(container).toBeDefined();
  });

  it("closes with Escape through router.replace to the list URL", () => {
    renderSheet();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(replace).toHaveBeenCalledWith("/ver-todo/vestidos?talle=S", { scroll: false });
  });

  it("closes from the scrim and the close button, both plain links to the list URL", () => {
    renderSheet();
    const links = screen.getAllByRole("link", { name: "Cerrar" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/ver-todo/vestidos?talle=S");
  });

  it("moves focus into the dialog and gives it back to the opener on close", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { unmount } = renderSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("keeps Tab inside the dialog", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const last = focusable.at(-1) as HTMLElement;
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(focusable[0]).toHaveFocus();
    focusable[0]?.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("locks the page scroll while open and restores it", () => {
    const { unmount } = renderSheet();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
