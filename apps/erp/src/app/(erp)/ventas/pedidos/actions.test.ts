import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveOrderAction, rejectOrderAction } from "./actions";

const calls: string[] = [];
let session = true;
const revalidated: string[] = [];

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidated.push(path) }));
vi.mock("../../../../lib/db", () => ({ getDb: () => ({ marker: "db" }) }));
vi.mock("../../../../lib/auth/session", () => ({
  requireSession: async () => {
    calls.push("session");
    if (!session) throw new Error("redirect");
    return {};
  },
}));
vi.mock("../../../../lib/orders/decide", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/orders/decide")>()),
  approveOrder: async (_db: unknown, id: string) => {
    calls.push(`approve ${id}`);
    return { ok: true, number: 42, salesCount: 1, lotIds: ["lot-1"] };
  },
  rejectOrder: async (_db: unknown, id: string) => {
    calls.push(`reject ${id}`);
    return { ok: true, number: 42 };
  },
}));

describe("order actions", () => {
  beforeEach(() => {
    calls.length = 0;
    revalidated.length = 0;
    session = true;
  });

  it("approve checks the session first, decides and refreshes every page the sales touch", async () => {
    const state = await approveOrderAction("o1");
    expect(calls).toEqual(["session", "approve o1"]);
    expect(state).toMatchObject({ status: "success" });
    expect(revalidated).toEqual(
      expect.arrayContaining([
        "/ventas",
        "/ventas/pedidos",
        "/ventas/pedidos/o1",
        "/inventario",
        "/",
        "/compras/lot-1",
      ]),
    );
  });

  it("reject checks the session first and refreshes the order pages", async () => {
    const state = await rejectOrderAction("o1");
    expect(calls).toEqual(["session", "reject o1"]);
    expect(state).toMatchObject({ status: "success", message: "Pedido #0042 rechazado." });
    expect(revalidated).toEqual(expect.arrayContaining(["/ventas/pedidos", "/ventas/pedidos/o1"]));
  });

  it("does not decide anything without a session", async () => {
    session = false;
    await expect(approveOrderAction("o1")).rejects.toThrow("redirect");
    await expect(rejectOrderAction("o1")).rejects.toThrow("redirect");
    expect(calls).toEqual(["session", "session"]);
  });
});
