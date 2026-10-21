import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders a native button that defaults to type=button", () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the primary variant by default", () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent", "text-surface");
  });

  it("applies the whatsapp variant", () => {
    render(<Button variant="whatsapp">Escribinos</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-wa");
  });

  it("applies the secondary variant and size", () => {
    render(
      <Button variant="secondary" size="sm">
        Cancelar
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-line", "bg-surface", "h-8");
  });

  it("merges custom classes over variant classes", () => {
    render(<Button className="bg-warn">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-warn");
    expect(button).not.toHaveClass("bg-accent");
  });

  it("fires onClick and respects disabled", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Ok</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Ok
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
