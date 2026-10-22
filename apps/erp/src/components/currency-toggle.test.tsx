import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CurrencyToggle } from "./currency-toggle";

describe("CurrencyToggle", () => {
  it("is a labelled group with the active currency pressed", () => {
    render(<CurrencyToggle currency="gs" canUseUsd action={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Moneda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gs" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "US$" })).toHaveAttribute("aria-pressed", "false");
  });

  it("marks US$ pressed when it is the selected currency", () => {
    render(<CurrencyToggle currency="usd" canUseUsd action={vi.fn()} />);
    expect(screen.getByRole("button", { name: "US$" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Gs" })).toHaveAttribute("aria-pressed", "false");
  });

  it("submits the chosen currency to the action", () => {
    const action = vi.fn();
    render(<CurrencyToggle currency="gs" canUseUsd action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "US$" }));
    expect(action).toHaveBeenCalledTimes(1);
    const data = action.mock.calls[0]?.[0] as FormData;
    expect(data.get("currency")).toBe("usd");
  });

  it("disables US$ with a hint when there is no exchange rate", () => {
    render(<CurrencyToggle currency="gs" canUseUsd={false} action={vi.fn()} />);
    const usd = screen.getByRole("button", { name: "US$" });
    expect(usd).toBeDisabled();
    expect(usd).toHaveAttribute("title", "Guardá el TC del día en Parámetros");
    expect(screen.getByRole("button", { name: "Gs" })).toBeEnabled();
  });
});
