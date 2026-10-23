import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FramedPhoto } from "./framed-photo";

let observed: (() => void) | undefined;
let frame = { width: 400, height: 400 };

beforeEach(() => {
  frame = { width: 400, height: 400 };
  observed = undefined;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        observed = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => frame.width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => frame.height);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** next/image reports `onLoad` after an async decode, so wait for the layout to appear. */
async function load(image: HTMLElement, width: number, height: number) {
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(image);
  await waitFor(() => expect(image.parentElement?.style.width).not.toBe(""));
}

const wrapper = (image: HTMLElement) => image.parentElement as HTMLElement;

describe("FramedPhoto", () => {
  it("crops around the focal point until it knows both sizes", () => {
    render(
      <FramedPhoto src="/a.webp" alt="Vestido" sizes="100vw" focus={{ focusX: 50, focusY: 20 }} />,
    );
    const image = screen.getByRole("img");
    expect(image).toHaveClass("object-cover");
    expect(image.getAttribute("style")).toContain("object-position: 50% 20%");
    expect(wrapper(image).style.width).toBe("");
  });

  it("keeps the whole height of a wide photo and crops only its sides when automatic", async () => {
    render(<FramedPhoto src="/a.webp" alt="Vestido" sizes="100vw" focus={{}} />);
    const image = screen.getByRole("img");
    await load(image, 600, 400);
    const box = wrapper(image).style;
    expect([box.width, box.height, box.left, box.top]).toEqual(["600px", "400px", "-100px", "0px"]);
    expect(image).toHaveClass("object-cover");
  });

  it("keeps the whole height of a tall photo, with bands at its sides, when automatic", async () => {
    render(<FramedPhoto src="/a.webp" alt="Vestido" sizes="100vw" focus={{ focusY: 80 }} />);
    const image = screen.getByRole("img");
    await load(image, 400, 600);
    const box = wrapper(image).style;
    expect(box.height).toBe("400px");
    expect(box.top).toBe("0px");
    expect(Number.parseFloat(box.width)).toBeCloseTo(400 * (400 / 600));
  });

  it("follows the chosen zoom over the automatic rule", async () => {
    render(<FramedPhoto src="/a.webp" alt="Vestido" sizes="100vw" focus={{ fit: 100 }} />);
    const image = screen.getByRole("img");
    await load(image, 600, 400);
    const box = wrapper(image).style;
    expect([box.width, box.height, box.left]).toEqual(["600px", "400px", "-100px"]);
  });

  it("lays the photo out again when the frame changes size", async () => {
    render(<FramedPhoto src="/a.webp" alt="Vestido" sizes="100vw" focus={{ fit: 0 }} />);
    const image = screen.getByRole("img");
    await load(image, 400, 600);
    expect(wrapper(image).style.height).toBe("400px");
    frame = { width: 200, height: 300 };
    act(() => observed?.());
    expect(wrapper(image).style.height).toBe("300px");
  });
});
