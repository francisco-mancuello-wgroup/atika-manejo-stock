import { render, screen } from "@testing-library/react";
import type { CatalogSettingsView } from "../../../lib/catalog-view";
import type { PresentationCollection } from "../../../lib/presentation";
import PresentationPage, { dynamic, generateMetadata } from "./page";

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola {producto}",
  heroText: "x",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};
const collection: PresentationCollection = {
  slug: "casa-icona",
  name: "Casa Icona",
  pieces: [
    {
      id: "1",
      name: "COSTA VINO",
      priceGs: 1000,
      sizes: [{ size: "S", available: true }],
      photos: [{ url: "/media/a.webp", alt: "COSTA VINO" }],
      color: null,
      description: null,
    },
  ],
};
const getCollectionPresentation = vi.fn(
  async (..._args: unknown[]): Promise<PresentationCollection | null> => collection,
);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("../../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  getCollectionPresentation: (...args: unknown[]) => getCollectionPresentation(...args),
}));

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("Presentation page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("presents the collection of the slug", async () => {
    render(await PresentationPage(props("casa-icona")));
    expect(getCollectionPresentation.mock.calls.at(-1)?.[2]).toBe("casa-icona");
    expect(screen.getByRole("region", { name: "COSTA VINO" })).toHaveAttribute(
      "id",
      "casa-icona-pagina-1",
    );
  });

  it("is a 404 for an unknown collection", async () => {
    getCollectionPresentation.mockResolvedValueOnce(null);
    await expect(PresentationPage(props("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("titles the tab with the collection name", async () => {
    expect(await generateMetadata(props("casa-icona"))).toEqual({
      title: "Casa Icona · atika",
    });
  });
});
