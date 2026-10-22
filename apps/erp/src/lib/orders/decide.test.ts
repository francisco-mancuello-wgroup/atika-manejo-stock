import { describe, expect, it } from "vitest";
import { approveState, rejectState } from "./decide";

describe("approveState", () => {
  it("confirms the approval with the number of sales", () => {
    expect(approveState({ ok: true, number: 42, salesCount: 2, lotIds: [] })).toEqual({
      status: "success",
      message: "Pedido #0042 aprobado: se registraron 2 ventas.",
    });
    expect(approveState({ ok: true, number: 42, salesCount: 1, lotIds: [] })).toEqual({
      status: "success",
      message: "Pedido #0042 aprobado: se registró 1 venta.",
    });
  });

  it("names the line that lacks stock and says nothing was registered", () => {
    const state = approveState({
      ok: false,
      reason: "out_of_stock",
      number: 42,
      line: { productName: "Saco B", size: "U", quantity: 5, available: 2 },
    });
    expect(state).toEqual({
      status: "error",
      message:
        'No se aprobó el pedido #0042: de "Saco B" talle U piden 5 y quedan 2. No se registró ninguna venta.',
    });
  });

  it("says when there is no stock at all", () => {
    const state = approveState({
      ok: false,
      reason: "out_of_stock",
      number: 7,
      line: { productName: "Blusa", size: "M", quantity: 1, available: 0 },
    });
    expect(state.status === "error" && state.message).toContain("piden 1 y no queda stock");
  });

  it("explains an order that was already decided or does not exist", () => {
    expect(
      approveState({ ok: false, reason: "already_decided", number: 42, status: "approved" }),
    ).toEqual({ status: "error", message: "El pedido #0042 ya fue aprobado." });
    expect(
      approveState({ ok: false, reason: "already_decided", number: 42, status: "rejected" }),
    ).toEqual({ status: "error", message: "El pedido #0042 ya fue rechazado." });
    expect(approveState({ ok: false, reason: "not_found" })).toEqual({
      status: "error",
      message: "No se encontró el pedido.",
    });
  });
});

describe("rejectState", () => {
  it("confirms the rejection", () => {
    expect(rejectState({ ok: true, number: 42 })).toEqual({
      status: "success",
      message: "Pedido #0042 rechazado.",
    });
  });

  it("explains an order that was already decided", () => {
    expect(
      rejectState({ ok: false, reason: "already_decided", number: 42, status: "approved" }),
    ).toEqual({ status: "error", message: "El pedido #0042 ya fue aprobado." });
  });
});
