import { render, screen } from "@testing-library/react";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the átika logo as an accessible image", () => {
    render(<Wordmark />);
    expect(screen.getByRole("img", { name: "átika" })).toBeInTheDocument();
  });

  it("inherits the text color so it adapts to its container", () => {
    const { container } = render(<Wordmark />);
    expect(container.querySelector("path")).toHaveAttribute("fill", "currentColor");
  });

  it("keeps the brand proportions and accepts sizing classes", () => {
    render(<Wordmark className="h-7" />);
    const logo = screen.getByRole("img", { name: "átika" });
    expect(logo).toHaveAttribute("viewBox", "202.39 58.38 189.78 47.66");
    expect(logo).toHaveClass("h-7", "w-auto");
  });
});
