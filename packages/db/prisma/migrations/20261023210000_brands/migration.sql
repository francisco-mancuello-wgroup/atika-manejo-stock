-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "coverUrl" TEXT,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_key_key" ON "brands"("key");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- Exactly one fallback ("Otras marcas"): a partial unique index on the flag.
CREATE UNIQUE INDEX "brands_single_fallback" ON "brands"("isFallback") WHERE "isFallback";

-- Backfill: one brand per distinct trimmed, non-empty products.brand (grouped case-insensitively,
-- the most used spelling is the name). Casa Icona, Milonga and Sordo keep their home order,
-- the rest follow alphabetically and "Otras marcas" closes the list.
WITH spellings AS (
    SELECT btrim("brand") AS "spelling", lower(btrim("brand")) AS "key", count(*) AS "uses"
    FROM "products"
    WHERE btrim(coalesce("brand", '')) <> '' AND lower(btrim("brand")) <> 'otras marcas'
    GROUP BY btrim("brand")
),
named AS (
    SELECT DISTINCT ON ("key") "key", "spelling" AS "name"
    FROM spellings
    ORDER BY "key", "uses" DESC, "spelling"
),
slugged AS (
    SELECT "key", "name",
        coalesce(nullif(trim(both '-' from regexp_replace(
            translate("key", 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc'),
            '[^a-z0-9]+', '-', 'g')), ''), 'marca') AS "base"
    FROM named
),
unique_slugs AS (
    SELECT "key", "name",
        CASE
            WHEN "base" IN ('todos', 'pink', 'otras-marcas') THEN "base" || '-marca'
            ELSE "base"
        END AS "base"
    FROM slugged
),
numbered AS (
    SELECT "key", "name", "base",
        row_number() OVER (PARTITION BY "base" ORDER BY "key") AS "n",
        row_number() OVER (
            ORDER BY
                CASE "key" WHEN 'casa icona' THEN 1 WHEN 'milonga' THEN 2 WHEN 'sordo' THEN 3 ELSE 4 END,
                "key"
        ) - 1 AS "position"
    FROM unique_slugs
)
INSERT INTO "brands" ("id", "name", "key", "slug", "position", "updatedAt")
SELECT gen_random_uuid(), "name", "key",
    CASE WHEN "n" = 1 THEN "base" ELSE "base" || '-' || "n" END,
    "position", CURRENT_TIMESTAMP
FROM numbered;

INSERT INTO "brands" ("id", "name", "key", "slug", "position", "isFallback", "updatedAt")
SELECT gen_random_uuid(), 'Otras marcas', 'otras marcas', 'otras-marcas',
    coalesce(max("position") + 1, 0), true, CURRENT_TIMESTAMP
FROM "brands";
