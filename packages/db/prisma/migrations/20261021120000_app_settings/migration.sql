-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "exchangeRate" DECIMAL(10,2) NOT NULL,
    "saleFactor" DECIMAL(6,3) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL,
    "costRate" DECIMAL(5,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

