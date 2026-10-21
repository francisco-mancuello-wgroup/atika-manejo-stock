import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Catalog home page", () => {
  it("sets the hero heading in the display serif font", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("font-display");
  });

  it("renders the hero heading and the pricing note", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Prendas seleccionadas, piezas únicas." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Precios con IVA incluido · Consultas por WhatsApp"),
    ).toBeInTheDocument();
  });
});
