/**
 * All money is handled as integer paise. Never floats.
 */

export const RUPEE = '₹';

function formatter(fractionDigits: 0 | 2) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const whole = formatter(0);
const withPaise = formatter(2);

/**
 * 1234500 -> "₹12,345" ; 150050 -> "₹1,500.50".
 * Paise are shown only when there are paise, and never half-shown ("₹1,500.5").
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return (paise % 100 === 0 ? whole : withPaise).format(rupees);
}

/** Plain digits for the UPI `am` parameter: 150050 -> "1500.50" */
export function paiseToAmParam(paise: number): string {
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
}

export type AmountResult =
  | { ok: true; paise: number }
  | { ok: false; error: string };

/**
 * Parse a user- or QR-supplied rupee amount into paise.
 * Rejects anything that is not a plain positive decimal with <= 2 places.
 */
export function parseRupeesToPaise(raw: string): AmountResult {
  const value = String(raw).trim().replace(/,/g, '');
  if (!value) return { ok: false, error: 'Enter an amount.' };
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return { ok: false, error: 'Use digits only, up to two decimal places.' };
  }
  const [whole, frac = ''] = value.split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return { ok: false, error: 'That amount is too large.' };
  if (paise <= 0) return { ok: false, error: 'Amount must be more than zero.' };
  if (paise > 1_00_00_000 * 100) return { ok: false, error: 'That amount is unrealistically large.' };
  return { ok: true, paise };
}
