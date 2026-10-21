const WA_BASE = "https://wa.me/";

/** wa.me only accepts the international number as digits (no +, spaces or dashes). */
function digitsOf(number: string): string {
  return number.replace(/\D/g, "");
}

/** Plain contact link (topbar): opens a chat with the store, with no prefilled text. */
export function whatsappContactUrl(number: string): string {
  return `${WA_BASE}${digitsOf(number)}`;
}

// "en talle {talle}", "de talle {talle}", "talle: {talle}", "el talle {talle}"
const SIZE_CLAUSE = /\s*(?:\b(?:en|de)\s+)?(?:el\s+)?talles?\s*:?\s*\{talle\}/gi;

/**
 * Template for a visitor who has not chosen a size: the clause that mentions the size is
 * removed ("... {producto} en talle {talle}. ¿Está disponible?" becomes "... {producto}. ¿Está
 * disponible?"), as is any leftover bare `{talle}`, and the spacing is tidied.
 */
function withoutSize(template: string): string {
  return template
    .replace(SIZE_CLAUSE, "")
    .replace(/\{talle\}/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:?!])/g, "$1")
    .trim();
}

function fillTemplate(template: string, { producto, talle }: { producto: string; talle?: string }) {
  const source = talle ? template : withoutSize(template);
  return source.replace(/\{(producto|talle)\}/g, (_match, key: string) =>
    key === "producto" ? producto : (talle ?? ""),
  );
}

/**
 * `https://wa.me/<digits>?text=<message>` with `{producto}` and `{talle}` filled in. Without a
 * size the size clause of the template is dropped. Placeholders are replaced in a single pass,
 * so a product name that contains `{talle}` is left untouched.
 */
export function buildWhatsappUrl(
  number: string,
  template: string,
  piece: { producto: string; talle?: string },
): string {
  return `${whatsappContactUrl(number)}?text=${encodeURIComponent(fillTemplate(template, piece))}`;
}

/**
 * Consult about one piece of a presentation page: the configured message for the chosen size,
 * followed by " – <color> – <price> – <link to the piece>", leaving out what is unknown.
 */
export function buildPieceWhatsappUrl(
  number: string,
  template: string,
  piece: {
    producto: string;
    talle: string;
    color: string | null;
    precio: string | null;
    link: string | null;
  },
): string {
  const message = [fillTemplate(template, piece), piece.color, piece.precio, piece.link]
    .filter(Boolean)
    .join(" – ");
  return `${whatsappContactUrl(number)}?text=${encodeURIComponent(message)}`;
}

/** Absolute link to a piece of a presentation page (relative when the origin is unknown). */
export function pieceLink(origin: string, slug: string, number: number): string {
  return `${origin}/catalogos/${slug}#${slug}-pagina-${number}`;
}

const HOST = /^[a-z0-9.-]+(?::\d{1,5})?$/i;
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\]|[^:]+\.local)(?::\d+)?$/i;

/**
 * Origin the visitor reached the site on, from the request headers (`x-forwarded-*` behind a
 * proxy, else `host`). Empty when there is no usable host, so links fall back to relative.
 */
export function requestOrigin(get: (name: string) => string | null | undefined): string {
  const first = (name: string) => get(name)?.split(",")[0]?.trim() ?? "";
  const host = first("x-forwarded-host") || first("host");
  if (!HOST.test(host)) return "";
  const forwarded = first("x-forwarded-proto");
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : LOCAL_HOST.test(host)
        ? "http"
        : "https";
  return `${proto}://${host}`;
}
