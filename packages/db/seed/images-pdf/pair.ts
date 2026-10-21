export interface ImageDims {
  width: number;
  height: number;
}

const MIN_SIDE = 300;
const MAX_ASPECT = 2.5;
const MIN_ASPECT = 0.3;

/** Product photos are at least 300px on the short side; logos and banners are small or very wide. */
export function isPhoto({ width, height }: ImageDims): boolean {
  const aspect = width / height;
  return Math.min(width, height) >= MIN_SIDE && aspect <= MAX_ASPECT && aspect >= MIN_ASPECT;
}

export interface Pairing<I, C> {
  pairs: { image: I; caption: C }[];
  unpairedImages: I[];
  unpairedCaptions: C[];
}

/**
 * Pairs photos with captions top to bottom. Captions arrive in reading order; photos are ordered
 * here. Only a page with as many photos as captions is paired: otherwise nothing is guessed.
 */
export function pairByOrder<I extends { top: number; left: number }, C>(
  images: readonly I[],
  captions: readonly C[],
): Pairing<I, C> {
  const ordered = [...images].sort((a, b) => a.top - b.top || a.left - b.left);
  if (ordered.length === 0 || ordered.length !== captions.length) {
    return { pairs: [], unpairedImages: ordered, unpairedCaptions: [...captions] };
  }
  return {
    pairs: ordered.flatMap((image, index) => {
      const caption = captions[index];
      return caption === undefined ? [] : [{ image, caption }];
    }),
    unpairedImages: [],
    unpairedCaptions: [],
  };
}
