"use server";

import { getDb } from "../lib/db";
import { createOrder } from "../lib/orders";

/**
 * "Pagar" of the public cart: saves the order and returns its number, or null when it was
 * rejected or the save failed (the cart then opens WhatsApp as it always did). The payload is
 * untrusted: `createOrder` validates it and prices every line on the server.
 */
export async function placeOrderAction(lines: unknown): Promise<{ number: number } | null> {
  try {
    const result = await createOrder(getDb(), lines);
    return result.ok ? { number: result.number } : null;
  } catch (error) {
    console.error("placeOrderAction failed", error);
    return null;
  }
}
