import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { CategorySelect, VisibilitySwitch } from "./product-controls";

const ok = async (): Promise<FormState> => ({ status: "success", message: "Cambio guardado." });

describe("VisibilitySwitch", () => {
  it("reflects the published state and flips it through the action", async () => {
    const action = vi.fn(ok);
    render(<VisibilitySwitch productId="p1" name="Vestido" isPublished={false} action={action} />);
    const toggle = screen.getByRole("switch", { name: "Visible: Vestido" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    await waitFor(() => expect(action).toHaveBeenCalledWith("p1", true));
  });

  it("shows the error when the action fails", async () => {
    const action = async (): Promise<FormState> => ({ status: "error", message: "No se pudo." });
    render(<VisibilitySwitch productId="p1" name="Vestido" isPublished action={action} />);
    fireEvent.click(screen.getByRole("switch", { name: "Visible: Vestido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo.");
  });
});

describe("CategorySelect", () => {
  it("offers no category plus the four storefront categories", () => {
    render(<CategorySelect productId="p1" name="Vestido" category="tops" action={ok} />);
    const select = screen.getByRole("combobox", { name: "Categoría: Vestido" });
    expect(select).toHaveValue("tops");
    expect(Array.from(select.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Sin categoría",
      "Vestidos",
      "Tops",
      "Faldas y shorts",
      "Accesorios",
    ]);
  });

  it("saves the chosen category", async () => {
    const action = vi.fn(ok);
    render(<CategorySelect productId="p1" name="Vestido" category={null} action={action} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Categoría: Vestido" }), {
      target: { value: "vestidos" },
    });
    await waitFor(() => expect(action).toHaveBeenCalledWith("p1", "vestidos"));
  });
});
