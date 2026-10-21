import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { BulkVisibilitySwitch } from "./bulk-visibility-switch";

const ok = async (): Promise<FormState> => ({ status: "success", message: "Listo." });

describe("BulkVisibilitySwitch", () => {
  it("is on only when every listed product is visible", () => {
    const { rerender } = render(
      <BulkVisibilitySwitch productIds={["a", "b"]} allVisible={false} action={ok} />,
    );
    const toggle = screen.getByRole("switch", { name: "Visibles: todos los de la lista" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    rerender(<BulkVisibilitySwitch productIds={["a", "b"]} allVisible action={ok} />);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("applies the new visibility to every listed product", async () => {
    const action = vi.fn(ok);
    render(<BulkVisibilitySwitch productIds={["a", "b"]} allVisible={false} action={action} />);
    fireEvent.click(screen.getByRole("switch", { name: "Visibles: todos los de la lista" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith(["a", "b"], true));
  });

  it("shows the error message when saving fails", async () => {
    const failing = async (): Promise<FormState> => ({ status: "error", message: "Falló." });
    render(<BulkVisibilitySwitch productIds={["a"]} allVisible action={failing} />);
    fireEvent.click(screen.getByRole("switch", { name: "Visibles: todos los de la lista" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falló.");
  });
});
