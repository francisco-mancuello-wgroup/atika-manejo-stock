-- CreateEnum
CREATE TYPE "bank_promo_kind" AS ENUM ('installments', 'refund', 'discount');

-- CreateEnum
CREATE TYPE "bank_promo_scope" AS ENUM ('all', 'lots', 'products');

-- CreateTable
CREATE TABLE "banks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_promos" (
    "id" UUID NOT NULL,
    "kind" "bank_promo_kind" NOT NULL,
    "value" INTEGER NOT NULL,
    "days" INTEGER[],
    "capGs" INTEGER,
    "startsAt" DATE,
    "endsAt" DATE,
    "terms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scope" "bank_promo_scope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_promos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_promo_banks" (
    "promoId" UUID NOT NULL,
    "bankId" UUID NOT NULL,

    CONSTRAINT "bank_promo_banks_pkey" PRIMARY KEY ("promoId","bankId")
);

-- CreateTable
CREATE TABLE "bank_promo_lots" (
    "promoId" UUID NOT NULL,
    "lotId" UUID NOT NULL,

    CONSTRAINT "bank_promo_lots_pkey" PRIMARY KEY ("promoId","lotId")
);

-- CreateTable
CREATE TABLE "bank_promo_products" (
    "promoId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "bank_promo_products_pkey" PRIMARY KEY ("promoId","productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_name_key" ON "banks"("name");

-- CreateIndex
CREATE INDEX "bank_promo_banks_bankId_idx" ON "bank_promo_banks"("bankId");

-- CreateIndex
CREATE INDEX "bank_promo_lots_lotId_idx" ON "bank_promo_lots"("lotId");

-- CreateIndex
CREATE INDEX "bank_promo_products_productId_idx" ON "bank_promo_products"("productId");

-- AddForeignKey
ALTER TABLE "bank_promo_banks" ADD CONSTRAINT "bank_promo_banks_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "bank_promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_promo_banks" ADD CONSTRAINT "bank_promo_banks_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_promo_lots" ADD CONSTRAINT "bank_promo_lots_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "bank_promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_promo_lots" ADD CONSTRAINT "bank_promo_lots_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_promo_products" ADD CONSTRAINT "bank_promo_products_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "bank_promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_promo_products" ADD CONSTRAINT "bank_promo_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

