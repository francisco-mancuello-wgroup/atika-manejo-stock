import { beforeEach, describe, expect, it, vi } from "vitest";

// No cookie at all: every guarded action must refuse before reaching the database.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: vi.fn(), delete: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(() => {
    throw new Error("database touched without a session");
  }),
}));
vi.mock("../lib/db", () => ({ getDb }));

const PUBLIC_MODULES = new Set(["./login/actions.ts"]);
const modules = import.meta.glob<Record<string, unknown>>("./**/actions.ts", { eager: true });

beforeEach(() => {
  getDb.mockClear();
});

describe("Server Actions require a session", () => {
  const guarded = Object.entries(modules).filter(([path]) => !PUBLIC_MODULES.has(path));

  it("finds every action module (the guard test is not vacuous)", () => {
    expect(guarded.map(([path]) => path).sort()).toEqual([
      "./(erp)/catalogo-web/actions.ts",
      "./(erp)/compras/[lotId]/actions.ts",
      "./(erp)/descuentos/actions.ts",
      "./(erp)/inventario/actions.ts",
      "./(erp)/parametros/actions.ts",
      "./(erp)/ventas/actions.ts",
    ]);
  });

  for (const [path, module] of guarded) {
    for (const [name, action] of Object.entries(module)) {
      it(`${path} ${name} redirects to /login`, async () => {
        expect(typeof action).toBe("function");
        await expect(
          (action as (...args: unknown[]) => Promise<unknown>)(
            "id",
            true,
            new FormData(),
            new FormData(),
          ),
        ).rejects.toThrow("NEXT_REDIRECT:/login");
        expect(getDb).not.toHaveBeenCalled();
      });
    }
  }
});
