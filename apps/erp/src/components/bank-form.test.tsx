import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { BankSummary } from "../lib/queries/banks";
import { type BankActions, BankForm } from "./bank-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "Banco guardado." });

const itau: BankSummary = {
  id: "b1",
  name: "Itaú",
  logoUrl: "/media/banks/uploads/b1/a.webp",
  promoCount: 2,
};
const conti: BankSummary = { id: "b2", name: "Continental", logoUrl: null, promoCount: 0 };

const actions = () => ({
  save: vi.fn<BankActions["save"]>(ok),
  remove: vi.fn<BankActions["remove"]>(ok),
});

const renderForm = (bank: BankSummary | null, a: BankActions = actions()) =>
  render(
    <BankForm
      bank={bank}
      save={a.save}
      remove={bank ? { action: a.remove, redirectTo: "/promos/bancos?tab=bancos" } : undefined}
    />,
  );

describe("BankForm", () => {
  it("opens an empty form for a new bank without a delete button", () => {
    renderForm(null);
    expect(screen.getByText("Nuevo banco", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nuevo banco" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.queryByRole("button", { name: /^Eliminar/ })).not.toBeInTheDocument();
  });

  it("shows the saved name, the current logo and offers to remove it", () => {
    renderForm(itau);
    expect(screen.getByText("Editar banco", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Itaú" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Itaú");
    expect(screen.getByRole("img", { name: "Logo actual" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quitar logo")).toBeInTheDocument();
  });

  it("falls back to the name chip and does not offer to remove a logo that does not exist", () => {
    renderForm(conti);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Quitar logo")).not.toBeInTheDocument();
  });

  it("previews the chosen logo before saving", () => {
    const create = vi.fn(() => "blob:preview");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    renderForm(conti);
    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Logo"), { target: { files: [file] } });
    expect(create).toHaveBeenCalledWith(file);
    expect(screen.getByRole("img", { name: "Logo nuevo" })).toHaveAttribute("src", "blob:preview");
  });

  it("blocks saving a logo too heavy to upload", async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
    renderForm(conti);
    const heavy = new File([new Uint8Array(5 * 1024 * 1024)], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Logo"), { target: { files: [heavy] } });
    expect(
      await screen.findByText("El logo pesa demasiado: probá con uno más liviano."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("saves bound to the bank id (null when creating)", async () => {
    const a = actions();
    const { unmount } = renderForm(null, a);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Sudameris" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(a.save).toHaveBeenCalled());
    expect(a.save.mock.calls[0]?.[0]).toBeNull();
    const formData = a.save.mock.calls[0]?.[2] as FormData;
    expect(formData.get("name")).toBe("Sudameris");
    unmount();

    const b = actions();
    renderForm(itau, b);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(b.save.mock.calls[0]?.[0]).toBe("b1"));
  });

  it("shows the success message and keeps the selection", async () => {
    renderForm(itau);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Banco guardado.");
  });

  it("shows validation errors from the action", async () => {
    const a = {
      save: vi.fn(
        async (): Promise<FormState> => ({
          status: "error",
          message: "Revisá los campos marcados.",
          fieldErrors: { name: "Ya existe un banco con ese nombre." },
          values: { name: "Itaú" },
        }),
      ),
      remove: vi.fn(ok),
    };
    renderForm(null, a);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Ya existe un banco con ese nombre.")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, shows a refusal and then goes to the next bank", async () => {
    const refusing = {
      save: vi.fn(ok),
      remove: vi.fn(
        async (): Promise<FormState> => ({ status: "error", message: "Lo usan 2 promociones." }),
      ),
    };
    const confirm = vi.spyOn(window, "confirm");
    const { unmount } = renderForm(itau, refusing);
    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Itaú" }));
    expect(refusing.remove).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Itaú" }));
    await waitFor(() => expect(refusing.remove).toHaveBeenCalledWith("b1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Lo usan 2 promociones.");
    expect(push).not.toHaveBeenCalled();
    unmount();

    const a = actions();
    renderForm(itau, a);
    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Itaú" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/promos/bancos?tab=bancos"));
  });
});
