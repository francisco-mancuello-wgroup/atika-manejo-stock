import { fireEvent, render, screen, within } from "@testing-library/react";
import { PiecePhotos } from "./piece-photos";

const photos = [
  { url: "/media/a.webp", alt: "Costa Coco" },
  { url: "/media/b.webp", alt: "Costa Coco" },
];

beforeEach(() => {
  // jsdom has no <dialog> modal API.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

describe("PiecePhotos", () => {
  it("fills the same frame with every photo, whatever its size", () => {
    render(<PiecePhotos photos={photos} label="Fotos de Costa Coco" priority={false} />);
    const list = screen.getByRole("list", { name: "Fotos de Costa Coco" });
    for (const image of within(list).getAllByRole("img")) {
      expect(image).toHaveClass("object-cover");
      expect(image).not.toHaveClass("object-contain");
    }
  });

  it("shows the whole photo, uncropped, when zoomed", () => {
    render(<PiecePhotos photos={photos} label="Fotos de Costa Coco" priority={false} />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ver en grande: Costa Coco" })[0] as HTMLElement,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(within(dialog).getByRole("img", { hidden: true })).toHaveClass("object-contain");
  });
});
