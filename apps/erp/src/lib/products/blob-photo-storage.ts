import { type BlobClient, createBlobUploads } from "../blob-uploads";
import { BLOB_UPLOADS_FOLDER, type PhotoStorage, UPLOADS_PREFIX } from "./photo-storage";

/** Product photos in Vercel Blob, so uploads survive deploys and are shared by every instance. */
export function createBlobPhotoStorage(client: BlobClient): PhotoStorage {
  const uploads = createBlobUploads(client, BLOB_UPLOADS_FOLDER, UPLOADS_PREFIX);
  return { saveProductPhoto: uploads.save, deleteProductPhoto: uploads.remove };
}
