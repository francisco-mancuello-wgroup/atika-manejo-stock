import { PageHeader } from "../../../components/page-header";
import { PaymentDetailsForm } from "../../../components/payment-details-form";
import { paymentPageUrl, paymentQrPng, paymentQrSvg, storeUrl } from "../../../lib/payment/qr";
import { getPaymentDetails } from "../../../lib/queries/payment";
import { savePaymentDetailsAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The bank details shoppers pay into, and the QR to print. The QR opens the store's
 * /datos-bancarios page, which reads these details live: editing them never changes the QR.
 */
export default async function DatosBancariosPage() {
  const url = paymentPageUrl(storeUrl());
  const [details, svg, png] = await Promise.all([
    getPaymentDetails(),
    paymentQrSvg(url),
    paymentQrPng(url),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Datos bancarios"
        description="Se muestran en la tienda para pagar por transferencia. Cambiarlos no cambia el QR."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,18rem)]">
        <PaymentDetailsForm details={details} action={savePaymentDetailsAction} />
        <section aria-labelledby="qr-heading" className="flex flex-col gap-3">
          <h2 id="qr-heading" className="text-sm font-medium text-ink">
            QR para imprimir
          </h2>
          <div
            role="img"
            aria-label={`QR que abre ${url}`}
            className="aspect-square w-full border border-line bg-white p-2"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG drawn by the qrcode library from our own URL
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="text-xs break-all text-muted">Abre {url}</p>
          <a
            href={png}
            download="atika-datos-bancarios-qr.png"
            className="w-fit border border-ink px-4 py-2 text-sm text-ink hover:bg-surface"
          >
            Descargar QR (PNG)
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm text-muted underline underline-offset-4"
          >
            Ver la página en la tienda
          </a>
        </section>
      </div>
    </div>
  );
}
