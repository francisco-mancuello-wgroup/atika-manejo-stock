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

/**
 * `https://wa.me/<digits>?text=<message>` with `{producto}` and `{talle}` filled in. Without a
 * size the size clause of the template is dropped. Placeholders are replaced in a single pass,
 * so a product name that contains `{talle}` is left untouched.
 */
export function buildWhatsappUrl(
  number: string,
  template: string,
  { producto, talle }: { producto: string; talle?: string },
): string {
  const source = talle ? template : withoutSize(template);
  const message = source.replace(/\{(producto|talle)\}/g, (_match, key: string) =>
    key === "producto" ? producto : (talle ?? ""),
  );
  return `${whatsappContactUrl(number)}?text=${encodeURIComponent(message)}`;
}
