-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "focusX" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "focusY" INTEGER NOT NULL DEFAULT 50;

-- Keep the focal point inside the photo.
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_focus_range" CHECK ("focusX" BETWEEN 0 AND 100 AND "focusY" BETWEEN 0 AND 100);
