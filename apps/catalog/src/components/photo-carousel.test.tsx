import { fireEvent, render, screen, within } from "@testing-library/react";
import { PhotoCarousel } from "./photo-carousel";

const photos = [
  { url: "/media/a.webp", alt: "Vestido" },
  { url: "/media/b.webp", alt: "Vestido" },
  { url: "/media/c.webp", alt: "Vestido" },
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
  Element.prototype.scrollTo = vi.fn();
});

describe("PhotoCarousel", () => {
  it("shows one slide per photo, each opening the zoom", () => {
    render(<PhotoCarousel photos={photos} name="Vestido" />);
    const group = screen.getByRole("group", { name: "Fotos de Vestido" });
    expect(within(group).getAllByRole("button", { name: /Ampliar foto/ })).toHaveLength(3);
  });

  it("fills the same frame with every photo, whatever its size", () => {
    render(<PhotoCarousel photos={photos} name="Vestido" />);
    const group = screen.getByRole("group", { name: "Fotos de Vestido" });
    for (const image of within(group).getAllByRole("img")) {
      expect(image).toHaveClass("object-cover");
      expect(image).not.toHaveClass("object-contain");
    }
  });

  it("keeps each photo's focal point in the frame, not in the zoom", () => {
    const focused = [
      { url: "/media/a.webp", alt: "Vestido", focusX: 30, focusY: 70 },
      { url: "/media/b.webp", alt: "Vestido" },
    ];
    render(<PhotoCarousel photos={focused} name="Vestido" />);
    const group = screen.getByRole("group", { name: "Fotos de Vestido" });
    const [first, second] = within(group).getAllByRole("img");
    expect(first?.getAttribute("style")).toContain("object-position: 30% 70%");
    expect(second?.getAttribute("style")).toContain("object-position: 50% 50%");
    fireEvent.click(screen.getAllByRole("button", { name: /Ampliar foto/ })[0] as HTMLElement);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(within(dialog).getByRole("img", { hidden: true }).getAttribute("style")).not.toContain(
      "object-position",
    );
  });

  it("shows dots only when there is more than one photo", () => {
    const { rerender } = render(<PhotoCarousel photos={photos} name="Vestido" />);
    expect(screen.getAllByRole("button", { name: /Ir a la foto/ })).toHaveLength(3);
    rerender(<PhotoCarousel photos={photos.slice(0, 1)} name="Vestido" />);
    expect(screen.queryAllByRole("button", { name: /Ir a la foto/ })).toHaveLength(0);
  });

  it("marks the first dot as current and scrolls to a photo from its dot", () => {
    render(<PhotoCarousel photos={photos} name="Vestido" />);
    const dots = screen.getAllByRole("button", { name: /Ir a la foto/ });
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(dots[1]).not.toHaveAttribute("aria-current");
    fireEvent.click(dots[2] as HTMLElement);
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it("follows the swipe: the current dot is the slide nearest to the scroll position", () => {
    render(<PhotoCarousel photos={photos} name="Vestido" />);
    const scroller = screen.getByRole("group", { name: "Fotos de Vestido" });
    Object.defineProperty(scroller, "clientWidth", { value: 400, configurable: true });
    scroller.scrollLeft = 410;
    fireEvent.scroll(scroller);
    const dots = screen.getAllByRole("button", { name: /Ir a la foto/ });
    expect(dots[1]).toHaveAttribute("aria-current", "true");
  });

  it("zooms the tapped photo in a dialog and closes it with the button", () => {
    render(<PhotoCarousel photos={photos} name="Vestido" />);
    fireEvent.click(screen.getAllByRole("button", { name: /Ampliar foto/ })[1] as HTMLElement);
    const dialog = screen.getByRole("dialog", { name: "Vestido, foto 2" });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(within(dialog).getByRole("img", { name: "Vestido" })).toHaveAttribute(
      "src",
      expect.stringContaining("b.webp"),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
