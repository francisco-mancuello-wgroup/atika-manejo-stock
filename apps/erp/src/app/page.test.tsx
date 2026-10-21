import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("ERP home page", () => {
  it("renders the Resumen heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeInTheDocument();
  });
});
