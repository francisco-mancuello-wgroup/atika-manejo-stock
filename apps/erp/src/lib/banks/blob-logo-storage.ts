import { type BlobClient, createBlobUploads } from "../blob-uploads";
import { BLOB_LOGOS_FOLDER, LOGOS_PREFIX, type LogoStorage } from "./logo-storage";

/** Bank logos in Vercel Blob, so uploads survive deploys and are shared by every instance. */
export function createBlobLogoStorage(client: BlobClient): LogoStorage {
  const uploads = createBlobUploads(client, BLOB_LOGOS_FOLDER, LOGOS_PREFIX);
  return { saveBankLogo: uploads.save, deleteBankLogo: uploads.remove };
}
