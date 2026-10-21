/** A color the catalog can name; `hex` is the swatch, null when the name has no single color. */
export interface PieceColor {
  label: string;
  hex: string | null;
}

interface KnownColor {
  label: string;
  hex: string;
  /** Normalized words (lowercase, no accents) that name this color; may be two words. */
  words: readonly string[];
}

/**
 * Real colors only, in Spanish. Prints and fantasy names the supplier uses in product names
 * (ESTAMPADO, RIO, SOLEIL, RAMBUTAN, PITAYA, ...) are multi-tone or not a color, so they have
 * no entry: they show as text (stored colors) or not at all (derived from a name).
 */
const KNOWN_COLORS: readonly KnownColor[] = [
  { label: "Negro", hex: "#1c1c1c", words: ["negro"] },
  { label: "Blanco", hex: "#f7f5f2", words: ["blanco"] },
  { label: "Marfil", hex: "#efe6d2", words: ["marfil"] },
  { label: "Crudo", hex: "#e8dcc4", words: ["crudo"] },
  { label: "Perla", hex: "#e6e0da", words: ["perla"] },
  { label: "Vino", hex: "#6d1f2c", words: ["vino"] },
  { label: "Azul", hex: "#2f4f8f", words: ["azul"] },
  { label: "Celeste", hex: "#8fc3e6", words: ["celeste"] },
  { label: "Verde", hex: "#4a6b4f", words: ["verde"] },
  { label: "Verde lima", hex: "#b5d334", words: ["verde lima", "lima"] },
  { label: "Fucsia", hex: "#c2185b", words: ["fucsia"] },
  { label: "Rosa", hex: "#e8a0b4", words: ["rosa"] },
  { label: "Rojo", hex: "#b3262e", words: ["rojo"] },
  { label: "Coral", hex: "#f0705a", words: ["coral"] },
  { label: "Cobre", hex: "#b36b3c", words: ["cobre"] },
  { label: "Amarillo", hex: "#e8c23a", words: ["amarillo"] },
  { label: "Tostado", hex: "#b88a5a", words: ["tostado"] },
  { label: "Chocolate", hex: "#4a2c20", words: ["chocolate"] },
  { label: "Coco", hex: "#a9856b", words: ["coco"] },
  { label: "Plata", hex: "#c4c4c4", words: ["plata"] },
];

/** English words the supplier uses. */
const SYNONYMS: Record<string, string> = { black: "negro", white: "blanco" };

const BY_WORDS = new Map(
  KNOWN_COLORS.flatMap((color) => color.words.map((words) => [words, color] as const)),
);

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => SYNONYMS[word] ?? word);
}

function lookup(key: string): PieceColor | null {
  const color = BY_WORDS.get(key);
  return color ? { label: color.label, hex: color.hex } : null;
}

/** First known color found in free text ("BLANCO CON COSTURAS TOSTADAS" gives Blanco). */
export function colorFromText(text: string): PieceColor | null {
  const list = words(text);
  for (const [index, word] of list.entries()) {
    const next = list[index + 1];
    const found = (next ? lookup(`${word} ${next}`) : null) ?? lookup(word);
    if (found) return found;
  }
  return null;
}

/** The color named by the end of a product name ("COSTA VINO" gives Vino), else null. */
export function colorFromName(name: string): PieceColor | null {
  const list = words(name);
  const last = list.at(-1);
  if (!last) return null;
  const previous = list.at(-2);
  return (previous ? lookup(`${previous} ${last}`) : null) ?? lookup(last);
}

function sentenceCase(text: string): string {
  if (text !== text.toUpperCase()) return text;
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * The color shown on a piece: the stored color text (swatch only when it names a known color),
 * else the color the name ends with. Stored values with digits are internal codes and are never
 * shown.
 */
export function resolveColor(stored: string | null | undefined, name: string): PieceColor | null {
  const text = stored?.trim();
  if (text && !/\d/.test(text)) {
    return { label: sentenceCase(text), hex: colorFromText(text)?.hex ?? null };
  }
  return colorFromName(name);
}
