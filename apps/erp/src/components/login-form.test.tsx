import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const loginAction = vi.fn();
vi.mock("../app/login/actions", () => ({
  loginAction: (...args: unknown[]) => loginAction(...args),
}));

describe("LoginForm", () => {
  it("renders the fields and carries the next path", () => {
    const { container } = render(<LoginForm next="/ventas" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
    expect(container.querySelector('input[name="next"]')).toHaveValue("/ventas");
  });

  it("shows the error returned by the action and keeps the email", async () => {
    loginAction.mockResolvedValue({
      status: "error",
      message: "Email o contraseña incorrectos.",
      values: { email: "a@b.c" },
    });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.c" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Ingresar" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.");
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue("a@b.c"));
  });
});
