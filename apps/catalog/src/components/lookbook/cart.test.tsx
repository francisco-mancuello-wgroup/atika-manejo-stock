import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { placeOrderAction } from "../../app/actions";
import type { CartItem } from "../../lib/cart";
import { navigateTo } from "../../lib/checkout";
import { CartProvider } from "./cart";

vi.mock("../../app/actions", () => ({ placeOrderAction: vi.fn() }));
vi.mock("../../lib/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/checkout")>()),
  navigateTo: vi.fn(),
}));

const saved: CartItem = {
  id: "p1",
  name: "Zamba",
  size: "M",
  color: null,
  priceGs: 100_000,
  link: null,
  quantity: 1,
};

function fakeWindow() {
  return { opener: {}, location: { href: "" }, close: vi.fn() };
}

function renderCart() {
  window.localStorage.setItem("atika-cart", JSON.stringify([saved]));
  render(<CartProvider whatsappNumber="+595 992 442692">{null}</CartProvider>);
}

const message = (url: string) => decodeURIComponent(url.split("?text=")[1] ?? "");

describe("Pagar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(placeOrderAction).mockReset();
    vi.mocked(navigateTo).mockReset();
  });

  it("saves the order, then opens WhatsApp with its number in the pre-opened tab", async () => {
    const popup = fakeWindow();
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.mocked(placeOrderAction).mockResolvedValue({ number: 42 });
    renderCart();

    fireEvent.click(await screen.findByRole("link", { name: "Pagar", hidden: true }));

    // The tab is opened synchronously inside the click, before the server answers.
    expect(open).toHaveBeenCalledWith("", "_blank");
    await waitFor(() => expect(popup.location.href).toContain("https://wa.me/595992442692"));
    expect(placeOrderAction).toHaveBeenCalledWith([{ productId: "p1", size: "M", quantity: 1 }]);
    expect(message(popup.location.href)).toContain("Pedido #0042");
    expect(popup.opener).toBeNull();
  });

  it("still opens WhatsApp with today's message when the order could not be saved", async () => {
    const popup = fakeWindow();
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.mocked(placeOrderAction).mockRejectedValue(new Error("down"));
    renderCart();

    fireEvent.click(await screen.findByRole("link", { name: "Pagar", hidden: true }));

    await waitFor(() => expect(popup.location.href).toContain("https://wa.me/"));
    expect(message(popup.location.href)).toContain("Quiero comprar");
    expect(message(popup.location.href)).not.toContain("Pedido #");
  });

  it("navigates this tab when the browser blocks the pop-up", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.mocked(placeOrderAction).mockResolvedValue({ number: 7 });
    renderCart();

    fireEvent.click(await screen.findByRole("link", { name: "Pagar", hidden: true }));

    await waitFor(() => expect(navigateTo).toHaveBeenCalledTimes(1));
    expect(message(vi.mocked(navigateTo).mock.calls[0]?.[0] ?? "")).toContain("Pedido #0007");
  });

  it("saves one order per press even when tapped twice", async () => {
    const popup = fakeWindow();
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.mocked(placeOrderAction).mockResolvedValue({ number: 1 });
    renderCart();

    const pay = await screen.findByRole("link", { name: "Pagar", hidden: true });
    fireEvent.click(pay);
    fireEvent.click(pay);

    await waitFor(() => expect(popup.location.href).toContain("wa.me"));
    expect(placeOrderAction).toHaveBeenCalledTimes(1);
  });
});
