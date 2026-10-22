import { fireEvent, render, screen, within } from "@testing-library/react";
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
    inGroup: false,
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

describe("AddToCart bank promos", () => {
  const twelve = {
    headline: "Hasta 12 cuotas sin intereses",
    kind: "installments" as const,
    value: 12,
    banks: [{ id: "b1", name: "Itaú", logoUrl: null }],
  };
  const refund = {
    headline: "20 % de reintegro",
    kind: "refund" as const,
    value: 20,
    banks: [{ id: "b2", name: "Continental", logoUrl: null }],
  };
  const promos = () => screen.queryByRole("region", { name: "Nuestras promociones bancarias" });

  it("shows the promos of the chosen color and switches them with it", () => {
    const marfil = { ...piece("p1", "Falda", "Marfil", ["S"], 761_000), bankPromos: [twelve] };
    const negro = { ...piece("p3", "Falda", "Negro", ["S", "M"], 790_000), bankPromos: [refund] };
    render(
      <CartProvider whatsappNumber="+595 992 442692">
        <AddToCart
          items={[{ name: "Falda", options: [marfil, negro] }]}
          set={false}
          description={null}
          link={null}
        />
      </CartProvider>,
    );
    expect(promos()).toHaveTextContent("Hasta 12 cuotas sin intereses");
    expect(promos()).not.toHaveTextContent("reintegro");
    fireEvent.click(screen.getByRole("radio", { name: "Negro" }));
    expect(promos()).toHaveTextContent("20 % de reintegro");
    expect(promos()).not.toHaveTextContent("12 cuotas");
  });

  it("merges the promos of every garment of a set, once each", () => {
    const skirt = { ...piece("p1", "Falda", "Marfil", ["S"], 761_000), bankPromos: [twelve] };
    const shirt = {
      ...piece("p2", "T Bsc M", "Negro", ["S"], 664_000),
      bankPromos: [twelve, refund],
    };
    render(
      <CartProvider whatsappNumber="+595 992 442692">
        <AddToCart
          items={[
            { name: "Falda", options: [skirt] },
            { name: "T Bsc M", options: [shirt] },
          ]}
          set
          description={null}
          link={null}
        />
      </CartProvider>,
    );
    const items = within(promos() as HTMLElement).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Hasta 12 cuotas sin intereses"),
      expect.stringContaining("20 % de reintegro"),
    ]);
  });

  it("shows no block when the garments have no promos", () => {
    renderSet();
    expect(promos()).not.toBeInTheDocument();
  });
});
