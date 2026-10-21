import { render } from "@testing-library/react";
import { WhatsappIcon } from "./icons";

describe("WhatsappIcon", () => {
  it("draws the official WhatsApp glyph filled with the current text color", () => {
    const { container } = render(<WhatsappIcon />);
    const svg = container.querySelector("svg");
    const path = container.querySelector("path");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(path).toHaveAttribute("fill", "currentColor");
    expect(path?.getAttribute("d")).toMatch(/^M17\.472 14\.382/);
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });
});
