import { describe, expect, it } from "vitest";
import { parseLayoutXml } from "./layout";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<pdf2xml producer="poppler" version="24.02.0">
<page number="3" position="absolute" top="0" left="0" height="1262" width="892">
	<fontspec id="0" size="10" family="Inter Regular" color="#7f776d"/>
	<fontspec id="2" size="41" family="Cormorant Garamond Light" color="#141414"/>
<image top="105" left="69" width="692" height="930" src="out-3_1.jpg"/>
<text top="1073" left="69" width="184" height="49" font="2">Costa Coco</text>
<text top="1125" left="69" width="200" height="15" font="0">Blusa &amp; short <b>en</b> tono cacao</text>
</page>
<page number="4" position="absolute" top="0" left="0" height="1262" width="892">
	<fontspec id="0" size="12" family="Inter Regular" color="#7f776d"/>
<text top="10" left="5" width="1" height="1" font="0">0 4   /   1 8</text>
</page>
</pdf2xml>`;

describe("parseLayoutXml", () => {
  it("reads pages with their images and texts, resolving font sizes and entities", () => {
    const pages = parseLayoutXml(XML);
    expect(pages.map((p) => p.page)).toEqual([3, 4]);
    expect(pages[0]?.images).toEqual([
      { top: 105, left: 69, width: 692, height: 930, src: "out-3_1.jpg" },
    ]);
    expect(pages[0]?.texts).toEqual([
      { top: 1073, left: 69, size: 41, text: "Costa Coco" },
      { top: 1125, left: 69, size: 10, text: "Blusa & short en tono cacao" },
    ]);
    expect(pages[1]?.texts[0]).toMatchObject({ size: 12, text: "0 4   /   1 8" });
  });

  it("returns no pages for an empty document", () => {
    expect(parseLayoutXml("<pdf2xml></pdf2xml>")).toEqual([]);
  });
});
