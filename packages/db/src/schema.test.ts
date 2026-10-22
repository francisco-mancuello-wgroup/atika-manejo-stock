import { describe, expect, it } from "vitest";
import { Prisma } from "./generated/prisma/client";
import { LotPricingMode } from "./generated/prisma/enums";
import { createPrismaClient } from "./index";

describe("schema", () => {
  it("defines every model the ERP and catalog need", () => {
    expect(Object.values(Prisma.ModelName).sort()).toEqual([
      "AppSettings",
      "Bank",
      "BankPromo",
      "BankPromoBank",
      "BankPromoLot",
      "BankPromoProduct",
      "CatalogSettings",
      "Discount",
      "DiscountProduct",
      "GroupAllocation",
      "Lot",
      "PaymentDetails",
      "Product",
      "ProductImage",
      "ProductVariant",
      "PublicationGroup",
      "Sale",
      "Session",
      "Supplier",
      "User",
    ]);
  });

  it("keeps the exchange rate of the day and the lot defaults in AppSettings", () => {
    expect(Object.values(Prisma.AppSettingsScalarFieldEnum)).toEqual(
      expect.arrayContaining(["id", "exchangeRate", "saleFactor", "vatRate", "costRate"]),
    );
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

  it("lets each lot follow the global parameters or use its own", () => {
    expect(Object.values(Prisma.LotScalarFieldEnum)).toContain("pricingMode");
    expect(Object.values(LotPricingMode)).toEqual(["global", "custom"]);
  });

  it("has no manual Pink flag: the Pink event comes from the active publication group", () => {
    expect(Object.values(Prisma.ProductScalarFieldEnum)).not.toContain("inPink");
  });

  it("tracks units bought and current stock per size", () => {
    expect(Object.values(Prisma.ProductVariantScalarFieldEnum)).toEqual(
      expect.arrayContaining(["productId", "size", "unitsBought", "stock"]),
    );
  });

  it("gives every size its own unique barcode", () => {
    expect(Object.values(Prisma.ProductVariantScalarFieldEnum)).toContain("barcode");
  });

  it("keeps the recalculated price and catalog visibility on the product", () => {
    expect(Object.values(Prisma.ProductScalarFieldEnum)).toEqual(
      expect.arrayContaining(["lotId", "originalValueUsd", "priceGs", "isPublished"]),
    );
  });

  it("keeps discounts with a window, a scope and an explicit product list", () => {
    expect(Object.values(Prisma.DiscountScalarFieldEnum)).toEqual(
      expect.arrayContaining(["name", "percent", "isActive", "startsAt", "endsAt", "scope"]),
    );
    expect(Object.values(Prisma.DiscountProductScalarFieldEnum)).toEqual(
      expect.arrayContaining(["discountId", "productId"]),
    );
  });

  it("keeps publication groups with a window and a per-size allocation with its sold counter", () => {
    expect(Object.values(Prisma.PublicationGroupScalarFieldEnum)).toEqual(
      expect.arrayContaining(["name", "isActive", "startsAt", "endsAt"]),
    );
    expect(Object.values(Prisma.GroupAllocationScalarFieldEnum)).toEqual(
      expect.arrayContaining(["groupId", "variantId", "allocated", "sold"]),
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
