-- CreateTable
CREATE TABLE "catalog_version" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_version_pkey" PRIMARY KEY ("id")
);

-- Seed the single row so the catalog can read it before the first ERP save.
INSERT INTO "catalog_version" ("id", "version", "updatedAt") VALUES (1, 0, CURRENT_TIMESTAMP);
