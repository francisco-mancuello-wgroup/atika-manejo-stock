-- CreateTable
CREATE TABLE "payment_details" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "holderName" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "accountGs" TEXT NOT NULL,
    "accountUsd" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_details_pkey" PRIMARY KEY ("id")
);
