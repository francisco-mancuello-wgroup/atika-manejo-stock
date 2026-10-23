import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteProductButton } from "./delete-product-button";

describe("DeleteProductButton", () => {
  it("opens a confirmation naming the product and deletes on confirm", async () => {
    const action = vi.fn().mockResolvedValue({ status: "success", message: "" });
    render(<DeleteProductButton productId="p1" name="Vestido Lino" block={null} action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("¿Eliminar «Vestido Lino»? Esta acción no se puede deshacer.");
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith("p1"));
  });

  it("closes without deleting on Cancelar", () => {
    const action = vi.fn();
    render(<DeleteProductButton productId="p1" name="Vestido" block={null} action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("shows the refusal from the server inside the dialog", async () => {
    const action = vi.fn().mockResolvedValue({ status: "error", message: "No se puede eliminar." });
    render(<DeleteProductButton productId="p1" name="Vestido" block={null} action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede eliminar.");
  });

  it("is disabled with the reason when the product has sales", () => {
    render(<DeleteProductButton productId="p1" name="Vestido" block="sales" action={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Eliminar producto" });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(
        "No se puede eliminar porque tiene ventas: las ventas conservan su historial.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains orders when only a web order blocks it", () => {
    render(<DeleteProductButton productId="p1" name="Vestido" block="orders" action={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Eliminar producto" })).toBeDisabled();
    expect(screen.getByText(/tiene pedidos/)).toBeInTheDocument();
  });
});
