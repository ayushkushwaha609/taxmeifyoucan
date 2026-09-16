/**
 * Dev helper: renders sample merchant UPI QR codes into ./samples so the
 * scanner and upload paths can be exercised without a real shop counter.
 *   node scripts/make-sample-qr.mjs
 */
import QRCode from 'qrcode';
import { mkdirSync } from 'node:fs';

const samples = {
  'merchant-10000': 'upi://pay?pa=chaipoint@okaxis&pn=Chai%20Point%20Koramangala&am=10000&cu=INR',
  'merchant-9500': 'upi://pay?pa=kirana.store@ybl&pn=Sharma%20Kirana&am=9500&cu=INR',
  'no-amount': 'upi://pay?pa=autowala@okicici&pn=Auto%20Bhai&cu=INR',
  'order-qr': 'upi://pay?pa=bigbazaar@hdfcbank&pn=Big%20Store&am=7400&cu=INR&tr=ORD00918&mc=5411',
  'not-upi': 'https://example.com/not-a-payment',
};

mkdirSync('samples', { recursive: true });
for (const [name, payload] of Object.entries(samples)) {
  await QRCode.toFile(`samples/${name}.png`, payload, { width: 512, margin: 2 });
  console.log('samples/' + name + '.png  ->  ' + payload);
}
