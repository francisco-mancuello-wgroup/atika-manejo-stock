/**
 * Copies the committed product photos into `public/media/products` before a build, with the
 * same URL layout the seed writes (`packages/db/seed/seed.ts`): `data/product-images` is served
 * under `/media/products` and `data/product-images-new` under `/media/products/brand-pdf`.
 * The bank logos (`data/bank-logos`) go under `/media/banks/seed`, where `db:banks` points them.
 * `public/media` is gitignored, so without this a fresh checkout (Vercel) has no photos.
 *
 * With `MEDIA_DIR` set (VPS), the same seed trees are also copied into `$MEDIA_DIR/products` and
 * `$MEDIA_DIR/banks/seed`, so the web server serves every `/media/*` from that folder. Uploads
 * (`products/uploads`, `banks/uploads`) live there too and are never removed: seed files are only
 * overwritten in place, and only `banks/seed` is replaced wholesale.
 */
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = (path) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const target = fileURLToPath(new URL("../public/media/products", import.meta.url));
const bankLogos = fileURLToPath(new URL("../public/media/banks/seed", import.meta.url));

const notManifest = (source) => !source.endsWith("manifest.json");

async function copyProducts(base, { clean }) {
  // `base` may hold uploads (MEDIA_DIR): only the build's own `public` copy is wiped first.
  if (clean) await rm(base, { recursive: true, force: true });
  const sources = [
    { from: root("data/product-images"), to: base },
    { from: root("data/product-images-new"), to: `${base}/brand-pdf` },
  ];
  for (const { from, to } of sources) {
    await mkdir(to, { recursive: true });
    await cp(from, to, { recursive: true, filter: notManifest });
  }
}

async function copyBankLogos(base) {
  await rm(base, { recursive: true, force: true });
  await mkdir(base, { recursive: true });
  await cp(root("data/bank-logos"), base, { recursive: true, filter: notManifest });
}

await copyProducts(target, { clean: true });
await copyBankLogos(bankLogos);
console.log(`copied product photos into ${target} and bank logos into ${bankLogos}`);

const mediaDir = process.env.MEDIA_DIR?.trim();
if (mediaDir) {
  const media = path.resolve(mediaDir);
  await copyProducts(path.join(media, "products"), { clean: false });
  await copyBankLogos(path.join(media, "banks", "seed"));
  console.log(`copied the same seed media into ${media} (uploads untouched)`);
}
