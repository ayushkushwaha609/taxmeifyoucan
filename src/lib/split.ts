export const DEFAULT_CHUNK_PAISE = 2000 * 100;

/** Hard stop so a mis-typed amount cannot generate hundreds of cards. */
export const MAX_STEPS = 60;

/**
 * Split a total into chunks of `chunkPaise` plus a final remainder.
 *   10,000 -> 5 x 2,000
 *   9,500  -> 4 x 2,000 + 1,500
 *   1,200  -> 1 x 1,200
 * Never emits a zero-value chunk, and the chunks always re-sum to the total.
 */
export function splitPaise(totalPaise: number, chunkPaise = DEFAULT_CHUNK_PAISE): number[] {
  if (!Number.isInteger(totalPaise) || totalPaise <= 0) return [];
  if (!Number.isInteger(chunkPaise) || chunkPaise <= 0) return [totalPaise];
  if (totalPaise <= chunkPaise) return [totalPaise];

  const full = Math.floor(totalPaise / chunkPaise);
  const remainder = totalPaise - full * chunkPaise;
  const chunks: number[] = new Array(full).fill(chunkPaise);
  if (remainder > 0) chunks.push(remainder);
  return chunks;
}
