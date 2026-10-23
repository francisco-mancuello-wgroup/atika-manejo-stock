import { siteRedirects } from "./site-redirect";

describe("siteRedirects", () => {
  it("adds nothing when no target origin is set", () => {
    expect(siteRedirects(undefined)).toEqual([]);
    expect(siteRedirects("   ")).toEqual([]);
  });

  it("sends every path to the same path on the target origin, temporarily", () => {
    expect(siteRedirects("https://atika.example.com/")).toEqual([
      { source: "/", destination: "https://atika.example.com/", permanent: false },
      {
        source: "/:path*",
        destination: "https://atika.example.com/:path*",
        permanent: false,
      },
    ]);
  });

  it("ignores a value that is not an http(s) origin", () => {
    expect(siteRedirects("atika.example.com")).toEqual([]);
    expect(siteRedirects("ftp://atika.example.com")).toEqual([]);
  });
});
