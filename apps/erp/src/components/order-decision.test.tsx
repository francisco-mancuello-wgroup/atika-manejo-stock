import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { OrderDecision } from "./order-decision";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ok: FormState = { status: "success", message: "hecho" };

describe("OrderDecision", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("approves after confirming and refreshes the page", async () => {
    const approve = vi.fn().mockResolvedValue(ok);
    render(<OrderDecision orderId="o1" number={42} approve={approve} reject={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("#0042"));
    await waitFor(() => expect(approve).toHaveBeenCalledWith("o1"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("does nothing when the confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const approve = vi.fn();
    const reject = vi.fn();
    render(<OrderDecision orderId="o1" number={42} approve={approve} reject={reject} />);
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(approve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });

  it("rejects with its own action", async () => {
    const reject = vi.fn().mockResolvedValue(ok);
    render(<OrderDecision orderId="o1" number={42} approve={vi.fn()} reject={reject} />);
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(reject).toHaveBeenCalledWith("o1"));
  });

  it("shows why an approval failed and does not refresh", async () => {
    const approve = vi
      .fn()
      .mockResolvedValue({ status: "error", message: 'De "Saco B" talle U piden 5 y quedan 2.' });
    render(<OrderDecision orderId="o1" number={42} approve={approve} reject={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("piden 5 y quedan 2");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores a second press while the first is running", async () => {
    let resolve: (state: FormState) => void = () => {};
    const approve = vi.fn(
      () =>
        new Promise<FormState>((r) => {
          resolve = r;
        }),
    );
    render(<OrderDecision orderId="o1" number={42} approve={approve} reject={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Aprobar" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(approve).toHaveBeenCalledTimes(1);
    resolve(ok);
  });
});
