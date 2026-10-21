import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("ERP not found page", () => {
  it("explains the page does not exist and links back to Resumen", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al resumen" })).toHaveAttribute("href", "/");
  });
});
