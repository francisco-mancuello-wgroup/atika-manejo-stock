import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
  set: vi.fn((name: string, value: string) => {
    jar.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    jar.delete(name);
  }),
};
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const store = {
  insertSession: vi.fn(),
  findSessionByToken: vi.fn(),
  deleteSessionByToken: vi.fn(),
};

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../db", () => ({ getDb: () => ({}) }));
vi.mock("./session-store", () => store);

const { createSession, getSession, requireSession, revokeSession } = await import("./session");

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
});

describe("session cookie wrappers", () => {
  it("createSession stores the session and sets the hardened cookie", async () => {
    const expiresAt = new Date("2026-11-20T12:00:00.000Z");
    store.insertSession.mockResolvedValue({ token: "tok", expiresAt });
    await createSession("user-1");
    expect(store.insertSession).toHaveBeenCalledWith({}, "user-1", expect.any(Date));
    expect(cookieStore.set).toHaveBeenCalledWith("atika_session", "tok", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("getSession is null without a cookie and never touches the database", async () => {
    expect(await getSession()).toBeNull();
    expect(store.findSessionByToken).not.toHaveBeenCalled();
  });

  it("getSession looks the cookie token up", async () => {
    jar.set("atika_session", "tok");
    const found = { userId: "u", email: "a@b.c", expiresAt: new Date() };
    store.findSessionByToken.mockResolvedValue(found);
    expect(await getSession()).toBe(found);
    expect(store.findSessionByToken).toHaveBeenCalledWith({}, "tok", expect.any(Date));
  });

  it("requireSession redirects to /login when missing or unknown", async () => {
    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT:/login");
    jar.set("atika_session", "stale");
    store.findSessionByToken.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("requireSession returns the session when valid", async () => {
    jar.set("atika_session", "tok");
    const found = { userId: "u", email: "a@b.c", expiresAt: new Date() };
    store.findSessionByToken.mockResolvedValue(found);
    expect(await requireSession()).toBe(found);
  });

  it("revokeSession deletes the row and the cookie", async () => {
    jar.set("atika_session", "tok");
    await revokeSession();
    expect(store.deleteSessionByToken).toHaveBeenCalledWith({}, "tok");
    expect(cookieStore.delete).toHaveBeenCalledWith("atika_session");
    await revokeSession();
  });
});
