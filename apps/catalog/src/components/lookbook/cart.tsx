"use client";

import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { placeOrderAction } from "../../app/actions";
import {
  addToCart,
  type CartItem,
  cartCount,
  cartTotal,
  orderMessage,
  removeFromCart,
} from "../../lib/cart";
import { navigateTo, saveOrder } from "../../lib/checkout";
import { formatGs } from "../../lib/format";
import { discountLabel } from "../../lib/price";
import { whatsappContactUrl } from "../../lib/whatsapp";
import { BagIcon, CloseIcon, WhatsAppIcon } from "./icons";

const STORAGE_KEY = "atika-cart";

interface CartContextValue {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string, size: string) => void;
  open: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
}

/** Reads the saved cart; a missing, blocked or broken storage starts empty. */
function readSaved(): CartItem[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/**
 * The cart lives on the device (the store tablet), so it survives a reload. "Pagar" saves the
 * order on the server (so the ERP lists it) and opens WhatsApp with the whole order and its number.
 */
export function CartProvider({
  whatsappNumber,
  children,
}: {
  whatsappNumber: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const paying = useRef(false);

  useEffect(() => {
    setItems(readSaved());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private mode or full storage: the cart still works for this visit.
    }
  }, [items, loaded]);

  const value: CartContextValue = {
    items,
    add: (item) => setItems((current) => addToCart(current, item)),
    remove: (id, size) => setItems((current) => removeFromCart(current, id, size)),
    open: () => dialog.current?.showModal(),
  };

  const count = cartCount(items);
  const chatUrl = (orderNumber?: number | null) =>
    `${whatsappContactUrl(whatsappNumber)}?text=${encodeURIComponent(orderMessage(items, orderNumber))}`;
  // Without JavaScript (or with a modified click) the link still opens today's message.
  const payUrl = chatUrl();

  /**
   * Browsers only allow a new tab opened straight from the click, not after an await, so a blank
   * tab is opened first and pointed at WhatsApp once the order is saved (or failed). If the
   * browser still blocks it, this tab goes to WhatsApp instead (the cart stays in localStorage).
   */
  const pay = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (paying.current) return;
    paying.current = true;
    const tab = window.open("", "_blank");
    try {
      const url = chatUrl(await saveOrder(items, placeOrderAction));
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        navigateTo(url);
      }
    } finally {
      paying.current = false;
    }
  };

  return (
    <CartContext.Provider value={value}>
      {children}

      <button
        type="button"
        onClick={value.open}
        aria-label={count > 0 ? `Carrito: ${count} prendas` : "Carrito vacío"}
        className="fixed top-2 right-3 z-40 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface lg:right-6"
      >
        <BagIcon className="size-10" />
        {count > 0 && (
          <span className="absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-badge px-1 text-[11px] leading-5 text-background">
            {count}
          </span>
        )}
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop click mirrors Escape, which the native dialog already handles */}
      <dialog
        ref={dialog}
        aria-labelledby="cart-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-md bg-background p-0 text-foreground backdrop:bg-foreground/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 id="cart-title" className="font-heading text-[26px]">
              Tu carrito
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar carrito"
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-hover"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="flex-1 px-6 py-10 text-fg-muted">
              Todavía no agregaste prendas. Elegí un talle y tocá “Agregar al carrito”.
            </p>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
              {items.map((item) => (
                <li key={`${item.id}-${item.size}`} className="flex items-start gap-4 py-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="font-heading text-lg">{item.name}</p>
                    <p className="text-sm text-fg-muted">
                      {[
                        item.size === "U" ? "Talle único" : `Talle ${item.size}`,
                        item.color,
                        item.discountPercent ? discountLabel(item.discountPercent) : null,
                        item.quantity > 1 ? `x${item.quantity}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="text-sm tracking-[1px] whitespace-nowrap">
                    {item.priceGs == null ? "Consultar" : formatGs(item.priceGs * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => value.remove(item.id, item.size)}
                    aria-label={`Quitar ${item.name} talle ${item.size}`}
                    className="-mt-2 inline-flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-hover hover:text-foreground"
                  >
                    <CloseIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-4 border-t border-border px-6 py-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] tracking-[2.4px] text-fg-muted uppercase">Total</p>
              <p className="text-lg tracking-[1px]">{formatGs(cartTotal(items))}</p>
            </div>
            {items.length > 0 ? (
              <a
                href={payUrl}
                onClick={pay}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 bg-primary px-[30px] text-[15px] tracking-[1px] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <WhatsAppIcon className="size-5" />
                Pagar
              </a>
            ) : null}
            <p className="text-xs text-fg-muted">
              Al pagar se abre WhatsApp con tu pedido para coordinar el pago y la entrega.
            </p>
          </div>
        </div>
      </dialog>
    </CartContext.Provider>
  );
}
