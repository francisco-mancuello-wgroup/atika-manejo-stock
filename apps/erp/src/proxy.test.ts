// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isPublicPath, proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3001${path}`, {
    headers: cookie ? { cookie } : undefined,
  });

describe("isPublicPath", () => {
  it.each(["/login", "/_next/static/a.js", "/media/x.webp", "/favicon.ico", "/icon.png"])(
    "lets %s through",
    (path) => expect(isPublicPath(path)).toBe(true),
  );
  it.each(["/", "/inventario", "/compras/abc", "/loginx", "/media-private"])("guards %s", (path) =>
    expect(isPublicPath(path)).toBe(false),
  );
});

describe("proxy", () => {
  it("redirects to /login with the original path in next", () => {
    const response = proxy(request("/inventario?lote=1"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") as string);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/inventario?lote=1");
  });

  it("redirects the root path", () => {
    const location = proxy(request("/")).headers.get("location");
    expect(location).toBe("http://localhost:3001/login?next=%2F");
  });

  it("passes through with the session cookie present", () => {
    const response = proxy(request("/inventario", "atika_session=abc"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes /login and static assets without a cookie", () => {
    for (const path of ["/login", "/_next/static/x.css", "/media/a.webp"]) {
      expect(proxy(request(path)).headers.get("x-middleware-next")).toBe("1");
    }
  });
});
