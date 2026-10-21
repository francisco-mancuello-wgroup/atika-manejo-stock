-- CreateEnum
CREATE TYPE "catalog" AS ENUM ('casa-icona', 'milonga', 'sordo');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "catalog" "catalog",
ADD COLUMN     "catalogOrder" INTEGER,
ADD COLUMN     "catalogSection" TEXT,
ADD COLUMN     "catalogName" TEXT,
ADD COLUMN     "salePriceUsd" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "products_catalog_idx" ON "products"("catalog");

