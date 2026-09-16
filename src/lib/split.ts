import { formatPaise } from './money';

/** The per-step ceiling. Every generated step is at most this much. */
export const DEFAULT_CHUNK_PAISE = 1999 * 100;

/** "₹1,999" — derived, so UI copy always matches the real chunk size. */
export const CHUNK_LABEL = formatPaise(DEFAULT_CHUNK_PAISE);

/** Hard stop so a mis-typed amount cannot generate hundreds of cards. */
export const MAX_STEPS = 60;

/**
 * Split a total into chunks of `chunkPaise` plus a final remainder.
 *   10,000 -> 5 x 1,999 + 5
 *   9,500  -> 4 x 1,999 + 1,504
 *   1,200  -> 1 x 1,200
 * The chunk size does not divide evenly, so a small tail step is normal.
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
