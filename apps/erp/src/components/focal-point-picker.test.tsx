import { fireEvent, render, screen } from "@testing-library/react";
import { FocalPointPicker } from "./focal-point-picker";

const photo: {
  id: string;
  url: string;
  focusX: number;
  focusY: number;
  fit?: number | null;
} = { id: "img-1", url: "/media/products/a.webp", focusX: 50, focusY: 50 };

const renderPicker = (overrides: Partial<typeof photo> = {}) =>
  render(
    <form>
      <FocalPointPicker photo={{ ...photo, ...overrides }} index={0} />
    </form>,
  );

const point = (x: number, y: number) =>
  screen.getByRole("button", {
    name: `Punto de enfoque de la foto 1: ${x}% horizontal, ${y}% vertical`,
  });

const hidden = () => document.querySelector<HTMLInputElement>("input[name='focus.img-1']");

describe("FocalPointPicker", () => {
  it("submits the current point", () => {
    renderPicker({ focusX: 30, focusY: 70 });
    expect(point(30, 70)).toBeInTheDocument();
    expect(hidden()?.value).toBe("30,70");
  });

  it("places the point where the photo is clicked, as a percent of the photo", () => {
    renderPicker();
    const box = point(50, 50);
    box.getBoundingClientRect = () => ({ left: 100, top: 200, width: 200, height: 400 }) as DOMRect;
    fireEvent.click(box, { clientX: 150, clientY: 600 });
    expect(point(25, 50 + 50)).toBeInTheDocument();
    expect(hidden()?.value).toBe("25,100");
    expect(document.querySelector("[data-marker]")).toHaveStyle({ left: "25%", top: "100%" });
  });

  it("moves the point 5% per arrow key and stays inside the photo", () => {
    renderPicker({ focusX: 98, focusY: 2 });
    fireEvent.keyDown(point(98, 2), { key: "ArrowRight" });
    expect(hidden()?.value).toBe("100,2");
    fireEvent.keyDown(point(100, 2), { key: "ArrowUp" });
    expect(hidden()?.value).toBe("100,0");
    fireEvent.keyDown(point(100, 0), { key: "ArrowLeft" });
    fireEvent.keyDown(point(95, 0), { key: "ArrowDown" });
    expect(hidden()?.value).toBe("95,5");
  });

  it("centers the point with Centrar", () => {
    renderPicker({ focusX: 10, focusY: 90 });
    fireEvent.click(screen.getByRole("button", { name: "Centrar" }));
    expect(hidden()?.value).toBe("50,50");
    expect(point(50, 50)).toBeInTheDocument();
  });

  it("previews the crop on a phone (square) and on a desktop (5:6) around the point", () => {
    renderPicker({ focusX: 50, focusY: 20 });
    for (const label of ["Celular", "Escritorio"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    const previews = screen.getAllByTestId("crop-preview");
    expect(previews).toHaveLength(2);
    expect(previews[0]).toHaveClass("aspect-square");
    expect(previews[1]).toHaveClass("aspect-[5/6]");
    for (const preview of previews) {
      const image = preview.querySelector("img");
      expect(image?.getAttribute("style")).toContain("object-position: 50% 20%");
      expect(image).toHaveClass("object-cover");
    }
  });

  describe("zoom", () => {
    const fitField = () => document.querySelector<HTMLInputElement>("input[name='fit.img-1']");
    const slider = () => screen.getByRole("slider", { name: "Zoom de la foto 1" });
    const previewImage = (index: number) =>
      (screen.getAllByTestId("crop-preview")[index] as HTMLElement).querySelector(
        "img",
      ) as HTMLImageElement;
    const auto = () => screen.getByRole("checkbox", { name: "Automático" });

    it("is automatic by default and submits an empty value", () => {
      renderPicker();
      expect(auto()).toBeChecked();
      expect(fitField()?.value).toBe("");
      expect(screen.getByText("Completa")).toBeInTheDocument();
      expect(screen.getByText("Llenar")).toBeInTheDocument();
    });

    it("shows a stored zoom as a percent and submits it", () => {
      renderPicker({ fit: 40 });
      expect(auto()).not.toBeChecked();
      expect(slider()).toHaveValue("40");
      expect(screen.getByText("40%")).toBeInTheDocument();
      expect(fitField()?.value).toBe("40");
    });

    it("moves with the slider and leaves automatic mode", () => {
      renderPicker();
      fireEvent.change(slider(), { target: { value: "25" } });
      expect(fitField()?.value).toBe("25");
      expect(auto()).not.toBeChecked();
      expect(screen.getByText("25%")).toBeInTheDocument();
    });

    it("goes back to automatic with the checkbox", () => {
      renderPicker({ fit: 70 });
      fireEvent.click(auto());
      expect(fitField()?.value).toBe("");
      expect(auto()).toBeChecked();
    });

    it("previews the same layout as the web: whole photo at 0, filled at 100", () => {
      renderPicker({ fit: 0 });
      const source = document.querySelector("img") as HTMLImageElement;
      Object.defineProperty(source, "naturalWidth", { value: 600, configurable: true });
      Object.defineProperty(source, "naturalHeight", { value: 400, configurable: true });
      fireEvent.load(source);
      const box = (index: number) => {
        const { style } = previewImage(index);
        return [style.width, style.height, style.left, style.top].map(Number.parseFloat);
      };
      // square frame: 600x400 whole -> 100% wide, 66.7% tall, centered
      expect(box(0)[0]).toBeCloseTo(100, 3);
      expect(box(0)[1]).toBeCloseTo(66.667, 2);
      expect(box(0)[3]).toBeCloseTo(16.667, 2);
      // 5:6 frame (100 x 120): 600x400 whole -> 100% wide, 55.6% tall
      expect(box(1)[1]).toBeCloseTo(55.556, 2);
      fireEvent.change(slider(), { target: { value: "100" } });
      // filled: as tall as the frame, cropped sideways around the focus (50%)
      expect(box(0)[1]).toBeCloseTo(100, 3);
      expect(box(0)[0]).toBeCloseTo(150, 3);
      expect(box(0)[2]).toBeCloseTo(-25, 3);
    });

    it("resolves automatic from the photo's shape", () => {
      renderPicker();
      const source = document.querySelector("img") as HTMLImageElement;
      Object.defineProperty(source, "naturalWidth", { value: 600, configurable: true });
      Object.defineProperty(source, "naturalHeight", { value: 400, configurable: true });
      fireEvent.load(source);
      const { style } = previewImage(0);
      expect(Number.parseFloat(style.height)).toBeCloseTo(66.667, 2);
      // the stored value stays automatic
      expect(document.querySelector<HTMLInputElement>("input[name='fit.img-1']")?.value).toBe("");
    });
  });
});
