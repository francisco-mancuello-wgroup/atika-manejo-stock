import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders a textbox and forwards typed value to onChange", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Nombre" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Nombre" }), "ab");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("passes the type attribute through", () => {
    render(<Input aria-label="Clave" type="password" />);
    expect(screen.getByLabelText("Clave")).toHaveAttribute("type", "password");
  });

  it("merges custom classes with the base style", () => {
    render(<Input aria-label="x" className="h-12" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("h-12", "border-line");
    expect(input).not.toHaveClass("h-10");
  });
});
