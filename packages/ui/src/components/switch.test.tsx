import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Switch } from "./switch";

function Harness() {
  const [on, setOn] = useState(false);
  return <Switch checked={on} onCheckedChange={setOn} />;
}

describe("Switch", () => {
  it("exposes the switch role with aria-checked reflecting state", () => {
    const { rerender } = render(<Switch checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");

    rerender(<Switch checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onCheckedChange with the next value on click", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("toggles with the keyboard (Space and Enter)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const control = screen.getByRole("switch");

    control.focus();
    await user.keyboard(" ");
    expect(control).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Enter}");
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("does not fire when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} disabled />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Switch shape", () => {
  it("keeps its pill track", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("rounded-full");
  });
});
