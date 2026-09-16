/**
 * Generates the PWA icons without any image dependency: raw RGBA pixels
 * encoded straight to PNG with node's built-in zlib.
 *
 * The mark is three descending bars — one payment becoming several.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const TERRACOTTA = [192, 73, 42];
const MARIGOLD = [226, 155, 30];
const CREAM = [251, 247, 240];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };

  // Background: full bleed for maskable, rounded plate otherwise.
  const radius = maskable ? 0 : size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCorner =
        (x < radius && y < radius && (x - radius) ** 2 + (y - radius) ** 2 > radius ** 2) ||
        (x > size - radius && y < radius && (x - (size - radius)) ** 2 + (y - radius) ** 2 > radius ** 2) ||
        (x < radius && y > size - radius && (x - radius) ** 2 + (y - (size - radius)) ** 2 > radius ** 2) ||
        (x > size - radius && y > size - radius &&
          (x - (size - radius)) ** 2 + (y - (size - radius)) ** 2 > radius ** 2);
      if (!inCorner) set(x, y, TERRACOTTA);
    }
  }

  // Three bars, each shorter than the last, inside the maskable safe zone.
  const safe = maskable ? 0.62 : 0.74;
  const barH = Math.round(size * safe * 0.17);
  const gap = Math.round(size * safe * 0.14);
  const blockH = barH * 3 + gap * 2;
  const top = Math.round((size - blockH) / 2);
  const left = Math.round(size * (1 - safe) / 2);
  const maxW = Math.round(size * safe);
  const widths = [1, 0.66, 0.38];

  widths.forEach((factor, i) => {
    const y0 = top + i * (barH + gap);
    const w = Math.round(maxW * factor);
    const color = i === 2 ? MARIGOLD : CREAM;
    const r = barH / 2;
    for (let y = y0; y < y0 + barH; y++) {
      for (let x = left; x < left + w; x++) {
        const dxL = x - (left + r);
        const dxR = x - (left + w - r);
        const dy = y - (y0 + r);
        if (dxL < 0 && dxL * dxL + dy * dy > r * r) continue;
        if (dxR > 0 && dxR * dxR + dy * dy > r * r) continue;
        set(x, y, color);
      }
    }
  });

  return px;
}

mkdirSync('public/icons', { recursive: true });
const targets = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/maskable-512.png', 512, true],
];
for (const [path, size, maskable] of targets) {
  writeFileSync(path, encodePng(size, draw(size, { maskable })));
  console.log('wrote', path);
}
