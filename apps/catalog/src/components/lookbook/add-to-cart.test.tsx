import { fireEvent, render, screen } from "@testing-library/react";
import type { LookbookItem, LookbookPiece } from "../../lib/lookbook";
import { AddToCart } from "./add-to-cart";
import { CartProvider, useCart } from "./cart";

function piece(id: string, name: string, color: string, sizes: string[], priceGs: number) {
  return {
    id,
    name,
    sizes,
    color: { label: color, hex: color === "Negro" ? "#000000" : "#efe6d2" },
    description: null,
    priceGs,
    discountPercent: null,
    discountedPriceGs: null,
  } satisfies LookbookPiece;
}

const falda: LookbookItem = {
  name: "Falda",
  options: [
    piece("p1", "Falda", "Marfil", ["S"], 761_000),
    piece("p3", "Falda", "Negro", ["S", "M"], 790_000),
  ],
};
const top: LookbookItem = {
  name: "T Bsc M",
  options: [piece("p2", "T Bsc M", "Negro", ["S"], 664_000)],
};

function CartItems() {
  const { items } = useCart();
  return (
    <ul aria-label="carrito">
      {items.map((item) => (
        <li key={`${item.id}-${item.size}`}>{`${item.name} ${item.color} ${item.size}`}</li>
      ))}
    </ul>
  );
}

function renderSet() {
  render(
    <CartProvider whatsappNumber="+595 992 442692">
      <AddToCart items={[falda, top]} set description={null} link={null} />
      <CartItems />
    </CartProvider>,
  );
}

const cartLines = () => screen.getByRole("list", { name: "carrito" }).textContent;

describe("AddToCart", () => {
  beforeEach(() => window.localStorage.clear());

  it("has one button for the whole set and adds every garment with a size", () => {
    renderSet();
    const buttons = screen.getAllByRole("button", { name: /Agregar/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Agregar 2 prendas al carrito" }));
    expect(cartLines()).toBe("Falda Marfil ST Bsc M Negro S");
  });

  it("switches price and sizes with the color, and leaves out a garment whose size is tapped again", () => {
    renderSet();
    fireEvent.click(screen.getByRole("radio", { name: "Negro" }));
    expect(screen.getByText("Negro", { selector: "legend" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Talle M de Falda" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Talle M de Falda" }));
    fireEvent.click(screen.getByRole("button", { name: "Talle S de T Bsc M" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
    expect(cartLines()).toBe("Falda Negro M");
  });

  it("asks for sizes while nothing is chosen", () => {
    renderSet();
    fireEvent.click(screen.getByRole("button", { name: "Talle S de Falda" }));
    fireEvent.click(screen.getByRole("button", { name: "Talle S de T Bsc M" }));
    const button = screen.getByRole("button", { name: "Elegí tus talles" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
