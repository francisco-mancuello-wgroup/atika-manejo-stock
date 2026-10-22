import { describe, expect, it } from "vitest";
import { PAYMENT_PATH, paymentPageUrl, paymentQrPng, paymentQrSvg } from "./qr";

describe("payment QR", () => {
  it("points to the store's bank details page, never to the details themselves", () => {
    expect(paymentPageUrl("https://atika-event.vercel.app")).toBe(
      "https://atika-event.vercel.app/datos-bancarios",
    );
    expect(paymentPageUrl("https://tienda.example/")).toBe(
      "https://tienda.example/datos-bancarios",
    );
    expect(PAYMENT_PATH).toBe("/datos-bancarios");
  });

  it("draws the same QR for the same page, so editing the details never changes it", async () => {
    const url = paymentPageUrl("https://atika-event.vercel.app");
    const svg = await paymentQrSvg(url);
    expect(svg).toContain("<svg");
    expect(await paymentQrSvg(url)).toBe(svg);
    expect(await paymentQrPng(url)).toMatch(/^data:image\/png;base64,/);
  });
});
