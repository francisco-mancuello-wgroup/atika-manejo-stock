import { describe, expect, it } from "vitest";
import {
  addToCart,
  type CartItem,
  cartCount,
  cartTotal,
  orderMessage,
  removeFromCart,
} from "./cart";
import { formatGs } from "./format";

const zamba: CartItem = {
  id: "p1",
  name: "Zamba Azul",
  size: "M",
  color: "Azul",
  priceGs: 2_247_000,
  link: "https://atika-event.vercel.app/catalogos/casa-icona#casa-icona-pagina-6",
  quantity: 1,
};

describe("addToCart", () => {
  it("adds a new piece and size", () => {
    expect(addToCart([], zamba)).toEqual([zamba]);
  });

  it("adds one more unit of the same piece and size instead of a second line", () => {
    expect(addToCart([zamba], zamba)).toEqual([{ ...zamba, quantity: 2 }]);
  });

  it("keeps another size of the same piece on its own line", () => {
    const small = { ...zamba, size: "S" };
    expect(addToCart([zamba], small)).toEqual([zamba, small]);
  });
});

describe("removeFromCart", () => {
  it("removes the line of that piece and size", () => {
    const small = { ...zamba, size: "S" };
    expect(removeFromCart([zamba, small], "p1", "M")).toEqual([small]);
  });
});

describe("cart totals", () => {
  it("counts units and adds prices times quantity, skipping pieces without price", () => {
    const items = [
      { ...zamba, quantity: 2 },
      { ...zamba, id: "p2", size: "U", priceGs: null },
    ];
    expect(cartCount(items)).toBe(3);
    expect(cartTotal(items)).toBe(4_494_000);
  });
});

describe("orderMessage", () => {
  it("charges and shows the discounted price with its percent", () => {
    const discounted: CartItem = { ...zamba, priceGs: 1_798_000, discountPercent: 20 };
    expect(orderMessage([discounted])).toContain(
      `1. Zamba Azul – talle M – Azul – ${formatGs(1_798_000)} (-20 %) – https://`,
    );
    expect(orderMessage([discounted])).toContain(`Total: ${formatGs(1_798_000)}`);
  });

  it("lists every line with size, color, price and link, then the total", () => {
    const earcuff: CartItem = {
      id: "p9",
      name: "Cubagua Small",
      size: "U",
      color: "Oro",
      priceGs: 1_480_000,
      link: null,
      quantity: 2,
    };
    expect(orderMessage([zamba, earcuff])).toBe(
      [
        "Hola Átika! Quiero comprar:",
        `1. Zamba Azul – talle M – Azul – ${formatGs(2_247_000)} – https://atika-event.vercel.app/catalogos/casa-icona#casa-icona-pagina-6`,
        `2. Cubagua Small (x2) – Oro – ${formatGs(1_480_000)}`,
        `Total: ${formatGs(5_207_000)}`,
      ].join("\n"),
    );
  });
});
