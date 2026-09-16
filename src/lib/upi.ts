import { paiseToAmParam, parseRupeesToPaise } from './money';

/**
 * QR payload handling. Everything that comes out of a QR code is untrusted
 * input: we parse it, validate it, and re-encode it. We never eval it, never
 * render it as HTML, and never change the payee address.
 */

export interface UpiPayload {
  /** Payee VPA — copied through verbatim, never modified. */
  pa: string;
  /** Payee name as printed in the QR, if any. */
  pn?: string;
  /** Amount in paise, if the QR carried one. */
  amountPaise?: number;
  currency: string;
  /** Every other parameter, preserved for intent generation. */
  extras: Record<string, string>;
  /** Things the user should know before splitting this particular QR. */
  warnings: string[];
}

export type ParseResult =
  | { ok: true; payload: UpiPayload }
  | { ok: false; error: string };

const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9._-]{1,64}$/;


/** Parameters we deliberately drop when rebuilding a per-chunk intent. */
const DROPPED = new Set([
  'pa', 'pn', 'am', 'cu', 'sign', // `sign` is invalidated the moment `am` changes
  'minam', 'url', 'mode', 'purpose', 'orgid',
]);

/** Human-readable label, stripped of anything that could disguise itself on screen. */
export function safeText(value: string, max = 64): string {
  const out = String(value);
  let clean = '';
  for (const ch of out) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x20 || c === 0x7f) continue; // C0 controls
    if (c >= 0x200b && c <= 0x200f) continue; // zero-width and bidi marks
    if (c >= 0x202a && c <= 0x202e) continue; // bidi embedding
    if (c >= 0x2066 && c <= 0x2069) continue; // bidi isolates
    if (c === 0xfeff) continue; // BOM
    clean += ch;
  }
  return clean.slice(0, max).trim();
}

export function parseUpiQr(raw: string): ParseResult {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, error: 'That QR code was empty.' };

  if (/^0002\d{2}/.test(text)) {
    return {
      ok: false,
      error:
        'That looks like a Bharat QR / card QR, not a UPI payment link. This prototype only reads UPI QR codes.',
    };
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: 'This QR code is not a UPI payment link.' };
  }

  if (url.protocol.toLowerCase() !== 'upi:') {
    return { ok: false, error: 'This QR code is not a UPI payment link.' };
  }

  const params = url.searchParams;
  const pa = (params.get('pa') ?? '').trim();
  if (!pa) return { ok: false, error: 'This UPI QR has no payee address (UPI ID) in it.' };
  if (!VPA_RE.test(pa)) return { ok: false, error: `"${safeText(pa, 40)}" is not a valid UPI ID.` };

  const warnings: string[] = [];

  let amountPaise: number | undefined;
  const am = params.get('am');
  if (am) {
    const parsed = parseRupeesToPaise(am);
    if (!parsed.ok) {
      return { ok: false, error: `The amount in this QR ("${safeText(am, 20)}") is not readable.` };
    }
    amountPaise = parsed.paise;
  }

  const currency = (params.get('cu') ?? 'INR').toUpperCase();
  if (currency !== 'INR') {
    return { ok: false, error: `This QR is in ${safeText(currency, 8)}. Only INR QR codes are supported.` };
  }

  if (params.get('sign')) {
    warnings.push(
      'This QR is digitally signed for one fixed amount. Changing the amount voids that signature, so your UPI app may refuse these payments.',
    );
  }
  if (params.get('tr')) {
    warnings.push(
      'This is a one-off order QR (it carries a transaction reference). The merchant expects a single payment against it — split payments may be rejected or credited to the wrong order.',
    );
  }
  if (params.get('minam')) {
    warnings.push('This QR sets a minimum payable amount, which a split step may fall below.');
  }

  const extras: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (DROPPED.has(key.toLowerCase())) continue;
    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(key)) continue;
    extras[key] = String(value).slice(0, 256);
  }

  const pn = params.get('pn');
  return {
    ok: true,
    payload: {
      pa,
      pn: pn ? safeText(pn) || undefined : undefined,
      amountPaise,
      currency,
      extras,
      warnings,
    },
  };
}

/** Build the `upi://pay` intent for one chunk. Only `am` differs between chunks. */
export function buildUpiIntent(payload: UpiPayload, chunkPaise: number): string {
  const params = new URLSearchParams();
  params.set('pa', payload.pa);
  if (payload.pn) params.set('pn', payload.pn);
  params.set('am', paiseToAmParam(chunkPaise));
  params.set('cu', payload.currency);
  for (const [key, value] of Object.entries(payload.extras)) params.set(key, value);
  return `upi://pay?${params.toString()}`;
}

/** What we show on screen for the payee. Never the raw QR string. */
export function payeeLabel(payload: UpiPayload): string {
  return payload.pn || payload.pa.split('@')[0] || 'Unknown payee';
}

/** Masks the VPA for the shareable summary: "chaiwala@okaxis" -> "cha••••••@okaxis" */
export function maskVpa(pa: string): string {
  const [handle, bank = ''] = pa.split('@');
  const head = handle.slice(0, 3);
  return `${head}${'•'.repeat(Math.max(3, handle.length - 3))}@${bank}`;
}
