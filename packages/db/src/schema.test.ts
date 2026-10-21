import { describe, expect, it } from "vitest";
import { Prisma } from "./generated/prisma/client";
import { createPrismaClient } from "./index";

describe("schema", () => {
  it("defines every model the ERP and catalog need", () => {
    expect(Object.values(Prisma.ModelName).sort()).toEqual([
      "CatalogSettings",
      "Lot",
      "Product",
      "ProductImage",
      "ProductVariant",
      "Sale",
      "Session",
      "Supplier",
      "User",
    ]);
  });

  it("stores the pricing parameters on each lot", () => {
    expect(Object.values(Prisma.LotScalarFieldEnum)).toEqual(
      expect.arrayContaining([
        "exchangeRate",
        "saleFactor",
        "vatRate",
        "costRate",
        "totalShippingUsd",
      ]),
    );
  });

  it("tracks units bought and current stock per size", () => {
    expect(Object.values(Prisma.ProductVariantScalarFieldEnum)).toEqual(
      expect.arrayContaining(["productId", "size", "unitsBought", "stock"]),
    );
  });

  it("keeps the recalculated price and catalog visibility on the product", () => {
    expect(Object.values(Prisma.ProductScalarFieldEnum)).toEqual(
      expect.arrayContaining(["lotId", "originalValueUsd", "priceGs", "isPublished"]),
    );
  });

  it("stores only hashes for passwords and session tokens", () => {
    expect(Object.values(Prisma.UserScalarFieldEnum)).toContain("passwordHash");
    expect(Object.values(Prisma.UserScalarFieldEnum)).not.toContain("password");
    expect(Object.values(Prisma.SessionScalarFieldEnum)).toEqual(
      expect.arrayContaining(["tokenHash", "userId", "expiresAt"]),
    );
  });
});

describe("createPrismaClient", () => {
  it("requires a connection string", () => {
    expect(() => createPrismaClient("")).toThrow("DATABASE_URL");
  });

  it("builds a client for a local Postgres connection string without connecting", () => {
    const client = createPrismaClient("postgresql://atika:atika@localhost:5436/atika");
    expect(typeof client.$disconnect).toBe("function");
  });
});
