-- CreateEnum
CREATE TYPE "lot_pricing_mode" AS ENUM ('global', 'custom');

-- AlterTable
ALTER TABLE "lots" ADD COLUMN "pricingMode" "lot_pricing_mode" NOT NULL DEFAULT 'global';
