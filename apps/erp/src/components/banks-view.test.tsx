import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { BankSummary } from "../lib/queries/banks";
import { type BankActions, BanksView } from "./banks-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "Banco guardado." });

const banks: BankSummary[] = [
  { id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp", promoCount: 2 },
  { id: "b2", name: "Continental", logoUrl: null, promoCount: 0 },
];

const actions = () => ({
  save: vi.fn<BankActions["save"]>(ok),
  remove: vi.fn<BankActions["remove"]>(ok),
});

describe("BanksView", () => {
  it("lists every bank with its logo, or the name when it has none", () => {
    render(<BanksView banks={banks} actions={actions()} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0] as HTMLElement).getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("2 promociones")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).queryByRole("img")).not.toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Sin promociones")).toBeInTheDocument();
  });

  it("explains the empty state", () => {
    render(<BanksView banks={[]} actions={actions()} />);
    expect(screen.getByText("Todavía no cargaste bancos.")).toBeInTheDocument();
  });

  it("creates a bank from the form and refreshes the list", async () => {
    const a = actions();
    render(<BanksView banks={banks} actions={a} />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo banco" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Sudameris" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(a.save).toHaveBeenCalled());
    expect(a.save.mock.calls[0]?.[0]).toBeNull();
    const formData = a.save.mock.calls[0]?.[2] as FormData;
    expect(formData.get("name")).toBe("Sudameris");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("edits a bank bound to its id and offers to remove its logo", async () => {
    const a = actions();
    render(<BanksView banks={banks} actions={a} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar: Itaú" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Itaú");
    expect(screen.getByLabelText("Quitar logo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(a.save.mock.calls[0]?.[0]).toBe("b1"));
  });

  it("does not offer to remove a logo that does not exist", () => {
    render(<BanksView banks={banks} actions={actions()} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar: Continental" }));
    expect(screen.queryByLabelText("Quitar logo")).not.toBeInTheDocument();
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
    render(<BanksView banks={banks} actions={a} />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo banco" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Ya existe un banco con ese nombre.")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting and shows a refusal", async () => {
    const a = {
      save: vi.fn(ok),
      remove: vi.fn(
        async (): Promise<FormState> => ({ status: "error", message: "Lo usan 2 promociones." }),
      ),
    };
    const confirm = vi.spyOn(window, "confirm");
    render(<BanksView banks={banks} actions={a} />);

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Itaú" }));
    expect(a.remove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Itaú" }));
    await waitFor(() => expect(a.remove).toHaveBeenCalledWith("b1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Lo usan 2 promociones.");
  });
});
