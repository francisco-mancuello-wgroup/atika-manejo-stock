import { describe, expect, it } from "vitest";
import { buildWhatsappUrl, whatsappContactUrl } from "./whatsapp";

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
