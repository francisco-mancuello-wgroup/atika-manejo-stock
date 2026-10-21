import { describe, expect, it } from "vitest";
import { inferCategory } from "./infer";

const cases: [name: string, input: Parameters<typeof inferCategory>[0], expected: string | null][] =
  [
    // Zunilda: English garment words
    ["mini dress", { name: "BORDA MINI DRESS" }, "vestidos"],
    ["minidress as one word", { name: "PALOMA MINIDRESS" }, "vestidos"],
    ["maxi dress", { name: "JARDIN MAXI DRESS" }, "vestidos"],
    ["midi dress", { name: "ANCESTRAL MIDI DRESS" }, "vestidos"],
    ["crop top", { name: "OHAL CROP TOP" }, "tops"],
    ["shirt", { name: "PUEBLO SHIRT" }, "tops"],
    // Milonga: Spanish, with the trailing style letter
    ["vestido with letter", { name: "Vestido L A" }, "vestidos"],
    ["vestido alone", { name: "Vestido Negro" }, "vestidos"],
    ["camisa", { name: "Camisa A" }, "tops"],
    ["upper-case top", { name: "TOP AMA A" }, "tops"],
    ["falda", { name: "Falda A" }, "faldas-y-shorts"],
    // Átika
    ["dress", { name: "Lia Dress" }, "vestidos"],
    ["falda with brand word", { name: "Falda Sandro" }, "faldas-y-shorts"],
    ["top with brand word", { name: "Top Sandro" }, "tops"],
    ["marina top", { name: "Marina Top" }, "tops"],
    ["maxi alone is a dress length", { name: "Ginger Maxi" }, "vestidos"],
    ["a garment noun beats a length word", { name: "Rosa Midi Skirt" }, "faldas-y-shorts"],
    ["shorts", { name: "Bermuda Shorts" }, "faldas-y-shorts"],
    ["aros", { name: "Aros Sordo Cubagua Bañado en Oro 24KT" }, "accesorios"],
    ["earcuff", { name: "Earcuff Sordo Cubagua Bañado en Plata Large" }, "accesorios"],
    ["accents and case are ignored", { name: "CINTURÓN de cuero" }, "accesorios"],
    // whole words only
    ["a keyword inside another word does not count", { name: "Topacio" }, null],
    ["shirt inside tshirtless text", { name: "Shirtless Bay" }, null],
    // uncatalogued garments never get a category
    ["pants", { name: "Begonia Wide Leg Pants" }, null],
    ["cardigan", { name: "Cardigan A" }, null],
    ["poncho", { name: "Poncho Marfil" }, null],
    ["bikini", { name: "Sabrina Triangle Bikini" }, null],
    // abbreviations are never guessed
    ["abbreviation T BSC M", { name: "T BSC M A" }, null],
    ["abbreviation S PANTA", { name: "S PANTA A" }, null],
    ["abbreviation Bot", { name: "Bot Amar A" }, null],
    ["abbreviation SALIDA", { name: "SALIDA S A" }, null],
    ["abbreviation ENTERO", { name: "ENTERO A" }, null],
    ["placeholder name", { name: "Sin nombre (Sordo)" }, null],
    // Casa Icona: the name is not descriptive, the look description is
    [
      "look description with dress",
      { name: "VITTA NEGRO", lookDescription: "Vestido corto negro con aberturas" },
      "vestidos",
    ],
    [
      "look description without garment",
      { name: "COSTA VINO", lookDescription: "Prenda corta en tono vino" },
      null,
    ],
    ["no look description", { name: "NINA" }, null],
    // conflicts are never resolved
    [
      "a set of blouse and shorts",
      { name: "COSTA COCO", lookDescription: "Blusa clara y short en tono cacao" },
      null,
    ],
    ["conflict inside a name", { name: "Top y Falda" }, null],
    // product description is used when the name says nothing
    [
      "description used when the name is silent",
      { name: "Ligia", description: "Vestido midi de lino" },
      "vestidos",
    ],
    [
      "name wins over description",
      { name: "Marina Top", description: "Hecho como un vestido" },
      "tops",
    ],
  ];

describe("inferCategory", () => {
  it.each(cases)("%s", (_label, input, expected) => {
    expect(inferCategory(input).category).toBe(expected);
  });

  it("explains a match with the word and where it was found", () => {
    expect(inferCategory({ name: "Lia Dress" }).reason).toBe('"dress" in the name');
    expect(
      inferCategory({ name: "VITTA NEGRO", lookDescription: "Vestido corto negro" }).reason,
    ).toBe('"vestido" in the look description');
  });

  it("explains why nothing was assigned", () => {
    expect(inferCategory({ name: "S PANTA A" }).reason).toBe("no known garment word");
    expect(inferCategory({ name: "Begonia Wide Leg Pants" }).reason).toBe(
      'pantalones ("pants") has no catalog category',
    );
    expect(
      inferCategory({ name: "COSTA COCO", lookDescription: "Blusa clara y short en tono cacao" })
        .reason,
    ).toBe('conflict in the look description: tops ("blusa"), faldas-y-shorts ("short")');
  });
});
