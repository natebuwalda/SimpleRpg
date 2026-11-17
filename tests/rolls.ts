export function scriptedFaces(...faces: number[]): () => number {
  let index = 0;
  return () => { const face = faces[index++]; if (face === undefined) throw Error('Unexpected extra die'); return (face - 0.5) / 10; };
}
// Hero misses, slime scores three successes against a missed defense.
export const losingFaces = [1,1,1,1,1, 1,1,1, 8,8,8, 1,1,1,1];
// Hero deals two, slime deals two.
export const tradingFaces = [8,8,1,1,1, 1,1,1, 8,8,8, 8,1,1,1];
