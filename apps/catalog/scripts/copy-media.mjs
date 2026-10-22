/**
 * Copies the committed product photos into `public/media/products` before a build, with the
 * same URL layout the seed writes (`packages/db/seed/seed.ts`): `data/product-images` is served
 * under `/media/products` and `data/product-images-new` under `/media/products/brand-pdf`.
 * The bank logos (`data/bank-logos`) go under `/media/banks/seed`, where `db:banks` points them.
 * `public/media` is gitignored, so without this a fresh checkout (Vercel) has no photos.
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = (path) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const target = fileURLToPath(new URL("../public/media/products", import.meta.url));
const bankLogos = fileURLToPath(new URL("../public/media/banks/seed", import.meta.url));

const SOURCES = [
  { from: root("data/product-images"), to: target },
  { from: root("data/product-images-new"), to: `${target}/brand-pdf` },
];

await rm(target, { recursive: true, force: true });
for (const { from, to } of SOURCES) {
  await mkdir(to, { recursive: true });
  await cp(from, to, {
    recursive: true,
    filter: (source) => !source.endsWith("manifest.json"),
  });
}

await rm(bankLogos, { recursive: true, force: true });
await mkdir(bankLogos, { recursive: true });
await cp(root("data/bank-logos"), bankLogos, {
  recursive: true,
  filter: (source) => !source.endsWith("manifest.json"),
});
console.log(`copied product photos into ${target} and bank logos into ${bankLogos}`);
