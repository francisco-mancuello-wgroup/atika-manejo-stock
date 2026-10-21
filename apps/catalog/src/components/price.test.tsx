import { render, screen } from "@testing-library/react";
import { Price } from "./price";

const plain = { priceGs: 450_000, discountPercent: null, discountedPriceGs: null };
const discounted = { priceGs: 450_000, discountPercent: 20, discountedPriceGs: 360_000 };
const hidden = { priceGs: null, discountPercent: null, discountedPriceGs: null };

describe("Price", () => {
  it("shows the list price alone without a discount", () => {
    render(<p>{<Price {...plain} />}</p>);
    expect(screen.getByText("₲ 450.000")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(document.querySelector("s")).toBeNull();
  });

  it("shows the original struck through, the discounted price and the badge", () => {
    render(<p>{<Price {...discounted} />}</p>);
    const original = screen.getByText("₲ 450.000");
    expect(original.tagName).toBe("S");
    expect(screen.getByText("₲ 360.000")).toBeInTheDocument();
    expect(screen.getByText("-20 %")).toBeInTheDocument();
  });

  it("asks to consult the price when it is hidden", () => {
    render(<p>{<Price {...hidden} />}</p>);
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
  });
});
