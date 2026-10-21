/** URL of the cover image: the one with the lowest position, or null without images. */
export function coverUrl(images: readonly { url: string; position: number }[] | undefined) {
  const cover = [...(images ?? [])].sort((a, b) => a.position - b.position)[0];
  return cover?.url ?? null;
}
