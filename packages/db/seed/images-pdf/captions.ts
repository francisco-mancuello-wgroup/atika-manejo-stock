import type { PageLayout, PageText } from "./layout";

/** How a PDF names its products. */
export type CaptionKind =
  /** Casa Icona: a look number, then the look name, matching the "NN / total" footer. */
  | "numbered-looks"
  /** Sordo: a section title (Aros / Earcuffs) and one block of text per price. */
  | "sections"
  /** Milonga: pages only carry section titles, never a product name. */
  | "none";

export interface Caption {
  /** Text compared with product names. */
  text: string;
  detail: string | null;
}

export interface PageCaptions {
  captions: Caption[];
  /** The page says its images were recreated digitally. */
  recreated: boolean;
}

const byPosition = (a: PageText, b: PageText) => a.top - b.top || a.left - b.left;
const squash = (text: string) => text.replace(/\s+/g, "");

function numberedLooks(texts: PageText[]): Caption[] {
  const sorted = [...texts].sort(byPosition);
  const footer = sorted.find((t) => /^\d+\/\d+$/.test(squash(t.text)));
  const current = footer ? squash(footer.text).split("/")[0] : undefined;
  if (!footer || current === undefined) return [];
  const numberAt = sorted.findIndex(
    (t) => /^\d{1,2}$/.test(t.text) && Number(t.text) === Number(current),
  );
  if (numberAt < 0) return [];
  const [name, detail] = sorted.slice(numberAt + 1).filter((t) => t !== footer);
  return name ? [{ text: name.text, detail: detail?.text ?? null }] : [];
}

function sections(texts: PageText[]): Caption[] {
  const sorted = [...texts].sort(byPosition);
  const header = sorted.find((t) => /^(aros|earcuffs?)$/i.test(t.text.trim()));
  if (!header) return [];
  const section = /^earcuff/i.test(header.text.trim()) ? "Earcuff" : "Aros";
  const captions: Caption[] = [];
  let block: string[] = [];
  for (const item of sorted) {
    if (item === header) continue;
    if (/^Gs\./.test(item.text.trim())) {
      if (block.length > 0) captions.push({ text: [section, ...block].join(" "), detail: null });
      block = [];
    } else {
      block.push(item.text.trim());
    }
  }
  return captions;
}

/** Reads the product captions (top to bottom) from a page of the PDF's layout. */
export function parseCaptions(page: PageLayout, kind: CaptionKind): PageCaptions {
  const recreated = page.texts.some((t) => /recreadas digitalmente/i.test(t.text));
  if (kind === "none") return { captions: [], recreated };
  return {
    captions: kind === "numbered-looks" ? numberedLooks(page.texts) : sections(page.texts),
    recreated,
  };
}
