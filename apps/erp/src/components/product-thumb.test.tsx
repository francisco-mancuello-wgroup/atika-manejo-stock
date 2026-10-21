import { render, screen } from "@testing-library/react";
import { ProductThumb } from "./product-thumb";

describe("ProductThumb", () => {
  it("renders the photo at 40x52 with the product name as alt", () => {
    render(<ProductThumb src="/media/products/a/b.webp" name="Top Seda" />);
    const img = screen.getByRole("img", { name: "Top Seda" });
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "52");
    expect(img).toHaveClass("object-cover");
  });

  it("renders an empty sand block of the same size without a photo", () => {
    const { container } = render(<ProductThumb src={null} name="Top Seda" />);
    expect(screen.queryByRole("img")).toBeNull();
    const block = container.firstElementChild;
    expect(block).toHaveClass("bg-sand", "w-10");
    expect(block).toHaveAttribute("aria-hidden", "true");
  });
});
