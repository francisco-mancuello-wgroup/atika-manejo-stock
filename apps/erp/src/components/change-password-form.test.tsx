import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./change-password-form";

const changePasswordAction = vi.fn();
vi.mock("../app/(erp)/seguridad/actions", () => ({
  changePasswordAction: (...args: unknown[]) => changePasswordAction(...args),
}));

function submit() {
  fireEvent.submit(
    screen.getByRole("button", { name: "Cambiar contraseña" }).closest("form") as HTMLFormElement,
  );
}

describe("ChangePasswordForm", () => {
  it("renders the three password fields with the right autocomplete hints", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("Nueva contraseña")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Repetir nueva contraseña")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    for (const label of ["Contraseña actual", "Nueva contraseña", "Repetir nueva contraseña"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("type", "password");
    }
  });

  it("shows the field errors returned by the action", async () => {
    changePasswordAction.mockResolvedValue({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { currentPassword: "La contraseña actual no es correcta." },
    });
    render(<ChangePasswordForm />);
    submit();
    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the success message and leaves the fields empty", async () => {
    changePasswordAction.mockResolvedValue({
      status: "success",
      message: "Contraseña actualizada. Cerramos las otras sesiones abiertas.",
    });
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "abc" } });
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Contraseña actualizada. Cerramos las otras sesiones abiertas.",
    );
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("");
  });
});
