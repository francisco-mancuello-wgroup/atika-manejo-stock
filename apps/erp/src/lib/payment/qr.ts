import QRCode from "qrcode";

/** Store page with the bank details; the printed QR always points here. */
export const PAYMENT_PATH = "/datos-bancarios";

/** Public store address, for the QR (the ERP runs on its own domain). */
export function storeUrl(): string {
  return process.env.STORE_URL ?? "https://atika-event.vercel.app";
}

/**
 * The address the QR encodes: the store's bank details page, not the details. Editing them in
 * the ERP changes what the page shows, never the QR, so a printed QR keeps working.
 */
export function paymentPageUrl(store: string): string {
  return `${store.replace(/\/+$/, "")}${PAYMENT_PATH}`;
}

const OPTIONS = { errorCorrectionLevel: "M", margin: 2 } as const;

/** The QR as SVG markup, to show it in the ERP. */
export function paymentQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: "svg" });
}

/** The QR as a PNG data URL, to download and print. */
export function paymentQrPng(url: string): Promise<string> {
  return QRCode.toDataURL(url, { ...OPTIONS, width: 1024 });
}
