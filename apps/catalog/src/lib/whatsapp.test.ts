import { describe, expect, it } from "vitest";
import {
  buildPieceWhatsappUrl,
  buildWhatsappUrl,
  pieceLink,
  requestOrigin,
  whatsappContactUrl,
} from "./whatsapp";

const TEMPLATE = "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?";

describe("whatsappContactUrl", () => {
  it("keeps only the digits of the number", () => {
    expect(whatsappContactUrl("+595 981 123-456")).toBe("https://wa.me/595981123456");
  });

  it("opens WhatsApp without a recipient when there is no number", () => {
    expect(whatsappContactUrl("")).toBe("https://wa.me/");
    expect(whatsappContactUrl("abc")).toBe("https://wa.me/");
  });
});

describe("buildWhatsappUrl", () => {
  it("fills product and size, URL-encodes the text and keeps only digits in the number", () => {
    const url = buildWhatsappUrl("+595 981 123 456", TEMPLATE, {
      producto: "Vestido Lino",
      talle: "M",
    });
    expect(url).toBe(
      `https://wa.me/595981123456?text=${encodeURIComponent("Hola! Me interesa Vestido Lino en talle M. ¿Está disponible?")}`,
    );
  });

  it("fills every placeholder occurrence", () => {
    const url = buildWhatsappUrl("595981123456", "{producto} / {producto} / {talle}", {
      producto: "Top",
      talle: "S",
    });
    expect(new URL(url).searchParams.get("text")).toBe("Top / Top / S");
  });

  it("appends the price when one is given (discounted pieces)", () => {
    const text = new URL(
      buildWhatsappUrl("595981123456", TEMPLATE, {
        producto: "Vestido Lino",
        talle: "M",
        precio: "₲ 207.000 (-20 %)",
      }),
    ).searchParams.get("text");
    expect(text).toBe(
      "Hola! Me interesa Vestido Lino en talle M. ¿Está disponible? – ₲ 207.000 (-20 %)",
    );
  });

  it("omits the size clause when no size is chosen", () => {
    const text = new URL(
      buildWhatsappUrl("595981123456", TEMPLATE, { producto: "Vestido Lino" }),
    ).searchParams.get("text");
    expect(text).toBe("Hola! Me interesa Vestido Lino. ¿Está disponible?");
  });

  it("drops a bare {talle} token when no size is chosen", () => {
    const text = new URL(
      buildWhatsappUrl("595981123456", "Hola, quiero {producto} ({talle})", { producto: "Top" }),
    ).searchParams.get("text");
    expect(text).toBe("Hola, quiero Top");
  });

  it("does not treat placeholders inside the product name as placeholders", () => {
    const text = new URL(
      buildWhatsappUrl("595981123456", "Quiero {producto}", { producto: "Top {talle}" }),
    ).searchParams.get("text");
    expect(text).toBe("Quiero Top {talle}");
  });
});

describe("buildPieceWhatsappUrl", () => {
  const piece = {
    producto: "COSTA VINO",
    talle: "S",
    color: "Vino",
    precio: "₲ 1.879.000",
    link: "https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-2",
  };
  const text = (url: string) => new URL(url).searchParams.get("text");

  it("fills the configured template and appends color, price and the link to the piece", () => {
    expect(text(buildPieceWhatsappUrl("+595 981 123 456", TEMPLATE, piece))).toBe(
      "Hola! Me interesa COSTA VINO en talle S. ¿Está disponible? – Vino – ₲ 1.879.000 – https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-2",
    );
    expect(buildPieceWhatsappUrl("+595 981 123 456", TEMPLATE, piece)).toMatch(
      /^https:\/\/wa\.me\/595981123456\?text=/,
    );
  });

  it("skips the parts that are not known", () => {
    expect(
      text(buildPieceWhatsappUrl("595", TEMPLATE, { ...piece, color: null, precio: null })),
    ).toBe(
      "Hola! Me interesa COSTA VINO en talle S. ¿Está disponible? – https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-2",
    );
    expect(
      text(
        buildPieceWhatsappUrl("595", TEMPLATE, {
          producto: "X",
          talle: "M",
          color: null,
          precio: null,
          link: null,
        }),
      ),
    ).toBe("Hola! Me interesa X en talle M. ¿Está disponible?");
  });
});

describe("requestOrigin", () => {
  const headers = (values: Record<string, string>) => (name: string) => values[name] ?? null;

  it("uses the forwarded host and protocol behind a proxy", () => {
    expect(
      requestOrigin(
        headers({
          "x-forwarded-host": "catalogo.test",
          "x-forwarded-proto": "https",
          host: "internal:3000",
        }),
      ),
    ).toBe("https://catalogo.test");
  });

  it("falls back to the host header: http on localhost, https elsewhere", () => {
    expect(requestOrigin(headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(requestOrigin(headers({ host: "catalogo.test" }))).toBe("https://catalogo.test");
  });

  it("returns an empty origin without a host so links stay relative", () => {
    expect(requestOrigin(headers({}))).toBe("");
  });

  it("ignores hosts with characters that cannot belong to a host", () => {
    expect(requestOrigin(headers({ host: "evil.test/ <script>" }))).toBe("");
  });
});

describe("pieceLink", () => {
  it("is the absolute link to the piece anchor", () => {
    expect(pieceLink("https://catalogo.test", "casa-icona", 3)).toBe(
      "https://catalogo.test/catalogos/casa-icona#casa-icona-pagina-3",
    );
    expect(pieceLink("", "casa-icona", 3)).toBe("/catalogos/casa-icona#casa-icona-pagina-3");
  });
});
