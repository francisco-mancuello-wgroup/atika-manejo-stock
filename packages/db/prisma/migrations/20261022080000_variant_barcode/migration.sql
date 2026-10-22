-- Opaque, never-reused barcode per size: AT + 6 zero-padded digits from a sequence.
CREATE SEQUENCE "product_variant_barcode_seq" START 1;

-- AlterTable: add nullable, backfill existing variants in a stable order, then lock it down.
ALTER TABLE "product_variants" ADD COLUMN "barcode" TEXT;

UPDATE "product_variants" AS v
SET "barcode" = 'AT' || lpad(nextval('product_variant_barcode_seq')::text, 6, '0')
FROM (SELECT "id" FROM "product_variants" ORDER BY "id") AS ordered
WHERE v."id" = ordered."id";

ALTER TABLE "product_variants"
  ALTER COLUMN "barcode" SET NOT NULL,
  ALTER COLUMN "barcode" SET DEFAULT ('AT'::text || lpad((nextval('product_variant_barcode_seq'::regclass))::text, 6, '0'::text));

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");
