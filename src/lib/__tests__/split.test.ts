import { describe, expect, it } from 'vitest';
import { DEFAULT_CHUNK_PAISE, splitPaise } from '../split';
import { parseRupeesToPaise, formatPaise, paiseToAmParam } from '../money';
import { buildUpiIntent, parseUpiQr } from '../upi';

const R = (rupees: number) => rupees * 100;

describe('split engine', () => {
  it('turns 10,000 into exactly five 2,000 steps', () => {
    expect(splitPaise(R(10000))).toEqual([R(2000), R(2000), R(2000), R(2000), R(2000)]);
  });

  it('turns 9,500 into four 2,000 steps and a 1,500 remainder', () => {
    expect(splitPaise(R(9500))).toEqual([R(2000), R(2000), R(2000), R(2000), R(1500)]);
  });

  it('leaves an exact 2,000 as a single payment', () => {
    expect(splitPaise(R(2000))).toEqual([R(2000)]);
  });

  it('leaves anything under 2,000 as a single payment of the same amount', () => {
    expect(splitPaise(R(1200))).toEqual([R(1200)]);
    expect(splitPaise(1)).toEqual([1]);
  });

  it('never emits a zero-value chunk and always re-sums to the total', () => {
    for (const rupees of [1, 999, 2000, 2001, 4000, 9500, 10000, 12345.67]) {
      const total = Math.round(rupees * 100);
      const chunks = splitPaise(total);
      expect(chunks.every((c) => c > 0)).toBe(true);
      expect(chunks.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('handles paise remainders without floating-point drift', () => {
    expect(splitPaise(R(2000) + 1)).toEqual([R(2000), 1]);
    expect(splitPaise(Math.round(6000.05 * 100))).toEqual([R(2000), R(2000), R(2000), 5]);
  });

  it('rejects junk totals', () => {
    expect(splitPaise(0)).toEqual([]);
    expect(splitPaise(-500)).toEqual([]);
  });

  it('respects a non-default chunk size', () => {
    expect(splitPaise(R(10000), R(5000))).toEqual([R(5000), R(5000)]);
    expect(DEFAULT_CHUNK_PAISE).toBe(R(2000));
  });
});

describe('money', () => {
  it('parses rupee input into integer paise', () => {
    expect(parseRupeesToPaise('10000')).toEqual({ ok: true, paise: 1000000 });
    expect(parseRupeesToPaise('1,500.50')).toEqual({ ok: true, paise: 150050 });
    expect(parseRupeesToPaise('0.05')).toEqual({ ok: true, paise: 5 });
  });

  it('blocks zero, negative and malformed amounts', () => {
    for (const bad of ['0', '-5', '', 'abc', '1.234', '1e5', '₹100']) {
      expect(parseRupeesToPaise(bad).ok).toBe(false);
    }
  });

  it('formats in Indian style', () => {
    expect(formatPaise(R(1000000)).replace(/ /g, ' ')).toBe('₹10,00,000');
    expect(formatPaise(150050).replace(/ /g, ' ')).toBe('₹1,500.50');
  });

  it('writes the UPI am parameter without float noise', () => {
    expect(paiseToAmParam(R(2000))).toBe('2000');
    expect(paiseToAmParam(150050)).toBe('1500.50');
    expect(paiseToAmParam(5)).toBe('0.05');
  });
});

describe('UPI QR parsing', () => {
  it('reads a standard merchant QR', () => {
    const result = parseUpiQr('upi://pay?pa=chaiwala@okaxis&pn=Chai%20Point&am=10000&cu=INR');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.pa).toBe('chaiwala@okaxis');
    expect(result.payload.pn).toBe('Chai Point');
    expect(result.payload.amountPaise).toBe(R(10000));
  });

  it('accepts a QR with no amount', () => {
    const result = parseUpiQr('upi://pay?pa=chaiwala@okaxis&pn=Chai');
    expect(result.ok && result.payload.amountPaise).toBeUndefined();
  });

  it('rejects non-UPI and malformed payloads', () => {
    for (const bad of ['https://example.com', 'hello world', '', 'upi://pay?pn=NoPayee', 'upi://pay?pa=not-a-vpa']) {
      expect(parseUpiQr(bad).ok).toBe(false);
    }
  });

  it('rejects a Bharat QR with a specific message', () => {
    const result = parseUpiQr('000201010212...');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Bharat QR/);
  });

  it('rejects non-INR currencies', () => {
    expect(parseUpiQr('upi://pay?pa=shop@b&cu=USD&am=10').ok).toBe(false);
  });

  it('warns about signed and order-specific QRs', () => {
    const result = parseUpiQr('upi://pay?pa=shop@okhdfc&am=5000&sign=abc&tr=ORDER123');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.warnings).toHaveLength(2);
  });

  it('strips the signature but preserves other merchant parameters', () => {
    const result = parseUpiQr('upi://pay?pa=shop@okhdfc&am=5000&sign=abc&mc=5411&tn=Order');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const uri = buildUpiIntent(result.payload, R(2000));
    expect(uri).toContain('pa=shop%40okhdfc');
    expect(uri).toContain('am=2000');
    expect(uri).toContain('mc=5411');
    expect(uri).not.toContain('sign=');
  });

  it('never alters the payee address, and encodes injected characters', () => {
    const result = parseUpiQr('upi://pay?pa=shop@okicici&pn=A%26B%20%22Store%22&am=3000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const uri = buildUpiIntent(result.payload, R(2000));
    expect(new URL(uri).searchParams.get('pa')).toBe('shop@okicici');
    expect(new URL(uri).searchParams.get('pn')).toBe('A&B "Store"');
  });
});
