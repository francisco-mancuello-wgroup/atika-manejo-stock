import { render, screen } from "@testing-library/react";
import CategoryPage, { dynamicParams, generateStaticParams } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("catalog category page", () => {
  it("pre-renders one page per category and rejects unknown slugs", () => {
    expect(generateStaticParams()).toEqual([
      { categoria: "novedades" },
      { categoria: "vestidos" },
      { categoria: "tops" },
      { categoria: "faldas-y-shorts" },
      { categoria: "accesorios" },
    ]);
    expect(dynamicParams).toBe(false);
  });

  it("renders the category title and a coming-soon note", async () => {
    render(await CategoryPage({ params: Promise.resolve({ categoria: "faldas-y-shorts" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Faldas y shorts" })).toBeInTheDocument();
    expect(
      screen.getByText("Muy pronto vas a ver las prendas de esta categoría."),
    ).toBeInTheDocument();
  });

  it("responds not found for an unknown category", async () => {
    await expect(
      CategoryPage({ params: Promise.resolve({ categoria: "zapatos" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
