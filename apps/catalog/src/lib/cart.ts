import { formatGs } from "./format";
import { discountLabel } from "./price";

/** One line of the cart: a piece in one size. Kept on the device, never sent to the server. */
export interface CartItem {
  id: string;
  name: string;
  size: string;
  color: string | null;
  /** What the customer pays per unit (already discounted); null when the store hides prices. */
  priceGs: number | null;
  /** Percent off included in `priceGs`; absent in carts saved before discounts existed. */
  discountPercent?: number | null;
  /** Absolute link to the piece's page, for the order message. */
  link: string | null;
  quantity: number;
}

const sameLine = (item: CartItem, id: string, size: string) => item.id === id && item.size === size;

/** Adds a piece; the same piece in the same size adds a unit to its line. */
export function addToCart(items: readonly CartItem[], item: CartItem): CartItem[] {
  if (!items.some((line) => sameLine(line, item.id, item.size))) return [...items, item];
  return items.map((line) =>
    sameLine(line, item.id, item.size)
      ? { ...line, quantity: line.quantity + item.quantity }
      : line,
  );
}

export function removeFromCart(items: readonly CartItem[], id: string, size: string): CartItem[] {
  return items.filter((line) => !sameLine(line, id, size));
}

export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((sum, line) => sum + line.quantity, 0);
}

/** Sum of the priced lines (a piece without price is asked about in the chat). */
export function cartTotal(items: readonly CartItem[]): number {
  return items.reduce((sum, line) => sum + (line.priceGs ?? 0) * line.quantity, 0);
}

/** "#0042": the number the ERP shows for the order, so the owner can find it from the chat. */
export function formatOrderNumber(number: number): string {
  return `#${String(number).padStart(4, "0")}`;
}

/**
 * "Pagar": the whole order as one WhatsApp message, a line per piece and the total. When the
 * order was saved, its number closes the message ("Pedido #0042").
 */
export function orderMessage(items: readonly CartItem[], orderNumber?: number | null): string {
  const lines = items.map((line, index) => {
    const name = line.quantity > 1 ? `${line.name} (x${line.quantity})` : line.name;
    const parts = [
      name,
      line.size === "U" ? null : `talle ${line.size}`,
      line.color,
      line.priceGs == null
        ? null
        : line.discountPercent
          ? `${formatGs(line.priceGs)} (${discountLabel(line.discountPercent)})`
          : formatGs(line.priceGs),
      line.link,
    ].filter(Boolean);
    return `${index + 1}. ${parts.join(" – ")}`;
  });
  return [
    "Hola Átika! Quiero comprar:",
    ...lines,
    `Total: ${formatGs(cartTotal(items))}`,
    ...(orderNumber == null ? [] : [`Pedido ${formatOrderNumber(orderNumber)}`]),
  ].join("\n");
}
