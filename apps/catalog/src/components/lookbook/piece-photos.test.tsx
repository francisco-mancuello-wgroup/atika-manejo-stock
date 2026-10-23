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

  it("keeps each photo's focal point in the frame, and shows the whole photo when zoomed", () => {
    const focused = [
      { url: "/media/a.webp", alt: "Costa Coco", focusX: 50, focusY: 20 },
      { url: "/media/b.webp", alt: "Costa Coco" },
    ];
    render(<PiecePhotos photos={focused} label="Fotos de Costa Coco" priority={false} />);
    const list = screen.getByRole("list", { name: "Fotos de Costa Coco" });
    const [first, second] = within(list).getAllByRole("img");
    expect(first?.getAttribute("style")).toContain("object-position: 50% 20%");
    expect(second?.getAttribute("style")).toContain("object-position: 50% 50%");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ver en grande: Costa Coco" })[0] as HTMLElement,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(within(dialog).getByRole("img", { hidden: true }).getAttribute("style")).not.toContain(
      "object-position",
    );
  });

  it("keeps the photo frame the same height on every page, whatever the text below it", () => {
    render(<PiecePhotos photos={photos} label="Fotos de Costa Coco" priority={false} />);
    const list = screen.getByRole("list", { name: "Fotos de Costa Coco" });
    expect(list).toHaveClass("h-[48svh]", "flex-none");
    expect(list).not.toHaveClass("flex-1");
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
