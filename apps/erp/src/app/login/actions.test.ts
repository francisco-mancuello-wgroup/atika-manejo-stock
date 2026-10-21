import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const authenticate = vi.fn();
const createSession = vi.fn();
const revokeSession = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../lib/auth/login", () => ({ authenticate }));
vi.mock("../../lib/auth/session", () => ({ createSession, revokeSession }));

const { loginAction, logoutAction } = await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("loginAction", () => {
  it("creates a session and redirects to a safe next path", async () => {
    authenticate.mockResolvedValue({ status: "ok", userId: "u1" });
    await expect(
      loginAction({ status: "idle" }, form({ email: "a@b.c", password: "pw", next: "/ventas" })),
    ).rejects.toThrow("NEXT_REDIRECT:/ventas");
    expect(authenticate).toHaveBeenCalledWith(
      {},
      { email: "a@b.c", password: "pw" },
      "203.0.113.9",
    );
    expect(createSession).toHaveBeenCalledWith("u1");
  });

  it("ignores an external next path", async () => {
    authenticate.mockResolvedValue({ status: "ok", userId: "u1" });
    await expect(
      loginAction(
        { status: "idle" },
        form({ email: "a@b.c", password: "pw", next: "//evil.test" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("answers with one generic message for any credential failure and keeps only the email", async () => {
    authenticate.mockResolvedValue({ status: "invalid" });
    const state = await loginAction({ status: "idle" }, form({ email: "a@b.c", password: "pw" }));
    expect(state).toEqual({
      status: "error",
      message: "Email o contraseña incorrectos.",
      values: { email: "a@b.c" },
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("reports the rate limit", async () => {
    authenticate.mockResolvedValue({ status: "limited" });
    const state = await loginAction({ status: "idle" }, form({ email: "a@b.c", password: "pw" }));
    expect(state).toMatchObject({
      status: "error",
      message: "Demasiados intentos. Probá de nuevo en unos minutos.",
    });
  });

  it("does not leak infrastructure errors", async () => {
    authenticate.mockRejectedValue(new Error("connect ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await loginAction({ status: "idle" }, form({ email: "a@b.c", password: "pw" }));
    expect(state).toMatchObject({ status: "error" });
    expect(JSON.stringify(state)).not.toContain("ECONNREFUSED");
  });
});

describe("logoutAction", () => {
  it("revokes the session and goes to /login", async () => {
    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(revokeSession).toHaveBeenCalled();
  });
});
