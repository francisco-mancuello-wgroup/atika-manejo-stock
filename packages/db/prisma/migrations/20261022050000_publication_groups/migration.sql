-- CreateTable
CREATE TABLE "publication_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_allocations" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "allocated" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "group_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_allocations_variantId_idx" ON "group_allocations"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "group_allocations_groupId_variantId_key" ON "group_allocations"("groupId", "variantId");

-- AddForeignKey
ALTER TABLE "group_allocations" ADD CONSTRAINT "group_allocations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "publication_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_allocations" ADD CONSTRAINT "group_allocations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

