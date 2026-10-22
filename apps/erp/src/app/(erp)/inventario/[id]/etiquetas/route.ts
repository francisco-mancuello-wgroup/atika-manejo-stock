import { getSession } from "../../../../../lib/auth/session";
import { expandLabels, parseCopies } from "../../../../../lib/labels/layout";
import { renderLabelsPdf } from "../../../../../lib/labels/pdf";
import { getProductLabelData } from "../../../../../lib/queries/products";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `GET /inventario/<id>/etiquetas?copies-<size>=<n>`: the label PDF, one page per copy. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // The proxy only checks that a cookie exists; this is the real session check.
  if (!(await getSession())) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const product = UUID.test(id) ? await getProductLabelData(id) : null;
  if (!product) return new Response("Producto no encontrado", { status: 404 });

  const selection = parseCopies(new URL(request.url).searchParams, product.variants);
  const labels = expandLabels(product, product.variants, selection);
  if (labels.length === 0) {
    return new Response("Elegí al menos una copia para imprimir.", { status: 400 });
  }

  const pdf = await renderLabelsPdf(labels);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="etiquetas.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
