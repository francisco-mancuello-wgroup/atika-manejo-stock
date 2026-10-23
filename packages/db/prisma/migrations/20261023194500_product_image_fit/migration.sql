-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "fit" INTEGER;

-- Zoom: 0 shows the whole photo, 100 fills the frame, NULL is automatic.
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_fit_range" CHECK ("fit" IS NULL OR "fit" BETWEEN 0 AND 100);
