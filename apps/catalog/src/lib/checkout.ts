import type { CartItem } from "./cart";

/** How long "Pagar" waits for the server before opening WhatsApp without an order number. */
export const SAVE_TIMEOUT_MS = 5000;

export interface OrderLineInput {
  productId: string;
  size: string;
  quantity: number;
}

export type PlaceOrder = (lines: OrderLineInput[]) => Promise<{ number: number } | null>;

/** What the server needs from the cart: which piece, size and how many. Prices are never sent. */
export function orderLines(items: readonly CartItem[]): OrderLineInput[] {
  return items.map((item) => ({ productId: item.id, size: item.size, quantity: item.quantity }));
}

/**
 * Saves the cart as an order and returns its number, or null when it could not be saved (rejected,
 * offline, error or slower than `SAVE_TIMEOUT_MS`). Never throws: the customer can always pay.
 */
export async function saveOrder(
  items: readonly CartItem[],
  place: PlaceOrder,
  timeoutMs: number = SAVE_TIMEOUT_MS,
): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const saved = await Promise.race([place(orderLines(items)), timeout]);
    return saved?.number ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Moves this tab to `url` (the fallback when the browser blocks the pre-opened tab). */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
