export interface PageText {
  top: number;
  left: number;
  /** Font size in points, from the page's font table. */
  size: number;
  text: string;
}

export interface PageImage {
  top: number;
  left: number;
  width: number;
  height: number;
  /** File name relative to the folder pdftohtml wrote. */
  src: string;
}

export interface PageLayout {
  page: number;
  texts: PageText[];
  images: PageImage[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#x"))
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return ENTITIES[entity.toLowerCase()] ?? match;
    });
}

const PAGE = /<page number="(\d+)"[^>]*>([\s\S]*?)<\/page>/g;
const FONT = /<fontspec id="(\d+)" size="([\d.]+)"/g;
const IMAGE =
  /<image top="(-?[\d.]+)" left="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" src="([^"]+)"\/>/g;
const TEXT =
  /<text top="(-?[\d.]+)" left="(-?[\d.]+)" width="[\d.]+" height="[\d.]+" font="(\d+)">([\s\S]*?)<\/text>/g;

/** Parses the XML that `pdftohtml -xml` writes: text with positions and font sizes, and images. */
export function parseLayoutXml(xml: string): PageLayout[] {
  const pages: PageLayout[] = [];
  for (const [, number, body = ""] of xml.matchAll(PAGE)) {
    const sizes = new Map<string, number>();
    for (const [, id = "", size = "0"] of body.matchAll(FONT)) sizes.set(id, Number(size));

    const images = [...body.matchAll(IMAGE)].map(([, top, left, width, height, src]) => ({
      top: Number(top),
      left: Number(left),
      width: Number(width),
      height: Number(height),
      src: src ?? "",
    }));
    const texts = [...body.matchAll(TEXT)].map(([, top, left, font, content]) => ({
      top: Number(top),
      left: Number(left),
      size: sizes.get(font ?? "") ?? 0,
      text: decode(content ?? ""),
    }));
    pages.push({ page: Number(number), texts, images });
  }
  return pages;
}
