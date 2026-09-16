import { formatPaise } from './money';

/**
 * Draws the end-of-session summary as a 4:5 PNG, sized for a WhatsApp status
 * or an Instagram post.
 *
 * The card deliberately carries no UPI ID — only the merchant's display name —
 * so a screenshot of it can't be used to pay anyone.
 */

const W = 1080;
const H = 1350;
const PAD = 84;

const CREAM = '#fbf7f0';
const CREAM_DEEP = '#f3ece0';
const PAPER = '#fffdf8';
const INK = '#17130f';
const MUTED = '#7a6f63';
const LINE = '#e7dcca';
const TERRACOTTA = '#c0492a';
const MARIGOLD = '#e29b1e';
const LEAF = '#2f6f4a';

const DISPLAY = '"Instrument Serif", Georgia, serif';
const BODY = '"Inter", system-ui, sans-serif';

export interface ShareCardInput {
  merchant: string;
  totalPaise: number;
  steps: number[];
  paidCount: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Trims a label to fit a pixel width, with an ellipsis if it had to cut. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + '…';
}

function tracked(ctx: CanvasRenderingContext2D, px: number) {
  // ctx.letterSpacing is recent; ignoring it just renders slightly tighter.
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    /* older engine */
  }
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  // Without this the first draw falls back to Georgia mid-render.
  try {
    await document.fonts.ready;
  } catch {
    /* no font loading API */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  ctx.textBaseline = 'alphabetic';

  // ---------------------------------------------------------------- ground
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // The same faint block-print grid the app uses, fading out down the page.
  ctx.save();
  const fade = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  fade.addColorStop(0, 'rgba(192,73,42,0.09)');
  fade.addColorStop(1, 'rgba(192,73,42,0)');
  ctx.strokeStyle = fade;
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H * 0.75; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // -------------------------------------------------------------- wordmark
  ctx.fillStyle = TERRACOTTA;
  ctx.beginPath();
  ctx.arc(PAD + 11, 118, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `400 46px ${DISPLAY}`;
  ctx.fillText('chhutta', PAD + 38, 132);

  // ----------------------------------------------------------- the headline
  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${BODY}`;
  tracked(ctx, 3.4);
  ctx.fillText('TOTAL SPLIT', PAD, 268);
  tracked(ctx, 0);

  ctx.fillStyle = INK;
  ctx.font = `400 172px ${DISPLAY}`;
  ctx.fillText(formatPaise(input.totalPaise), PAD - 4, 408);

  ctx.fillStyle = MUTED;
  ctx.font = `500 34px ${BODY}`;
  ctx.fillText(`paid to ${fit(ctx, input.merchant, W - PAD * 2 - 130)}`, PAD, 464);

  // ------------------------------------------------------- the two stat cells
  const cellY = 530;
  const cellH = 208;
  const cellW = (W - PAD * 2 - 20) / 2;

  const cells: Array<[string, string]> = [
    ['PAYMENT STEPS', String(input.steps.length)],
    ['MARKED PAID', `${input.paidCount} of ${input.steps.length}`],
  ];

  cells.forEach(([label, value], i) => {
    const x = PAD + i * (cellW + 20);
    ctx.fillStyle = PAPER;
    roundRect(ctx, x, cellY, cellW, cellH, 28);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = MUTED;
    ctx.font = `600 22px ${BODY}`;
    tracked(ctx, 3);
    ctx.fillText(label, x + 34, cellY + 62);
    tracked(ctx, 0);

    ctx.fillStyle = i === 1 ? TERRACOTTA : INK;
    ctx.font = `400 88px ${DISPLAY}`;
    ctx.fillText(fit(ctx, value, cellW - 68), x + 32, cellY + 158);
  });

  // ------------------------------------------------------------ step chips
  ctx.fillStyle = MUTED;
  ctx.font = `600 22px ${BODY}`;
  tracked(ctx, 3);
  ctx.fillText('THE DAMAGE, STEP BY STEP', PAD, 832);
  tracked(ctx, 0);

  const chipH = 66;
  const chipGap = 14;
  // Two rows is what fits above the footer rule; the rest collapse into "+n more".
  const maxChipRows = 2;
  let chipX = PAD;
  let chipY = 866;
  let rows = 1;

  for (let i = 0; i < input.steps.length; i++) {
    const label = formatPaise(input.steps[i]);
    ctx.font = `600 30px ${BODY}`;
    const chipW = ctx.measureText(label).width + 52;

    if (chipX + chipW > W - PAD) {
      if (rows === maxChipRows) {
        const remaining = input.steps.length - i;
        if (remaining > 0) {
          ctx.fillStyle = MUTED;
          ctx.font = `500 30px ${BODY}`;
          ctx.fillText(`+${remaining} more`, chipX + 6, chipY + 44);
        }
        break;
      }
      chipX = PAD;
      chipY += chipH + chipGap;
      rows++;
    }

    const isRemainder = i === input.steps.length - 1 && input.steps.length > 1;
    const paid = i < input.paidCount;

    ctx.fillStyle = paid ? CREAM_DEEP : CREAM;
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = isRemainder ? TERRACOTTA : LINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isRemainder ? TERRACOTTA : INK;
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(label, chipX + 26, chipY + 44);

    chipX += chipW + chipGap;
  }

  // ------------------------------------------------------------- the footer
  const ruleY = H - 286;
  const stripe = [TERRACOTTA, MARIGOLD, LEAF];
  for (let i = 0, x = PAD; x < W - PAD; i++, x += 46) {
    ctx.fillStyle = stripe[i % 3];
    ctx.fillRect(x, ruleY, Math.min(46, W - PAD - x), 6);
  }

  ctx.fillStyle = INK;
  ctx.font = `italic 400 60px ${DISPLAY}`;
  ctx.fillText('Bada payment, chhote steps mein.', PAD, ruleY + 96);

  ctx.fillStyle = MUTED;
  ctx.font = `400 25px ${BODY}`;
  ctx.fillText('Steps confirmed by hand, not by any bank.', PAD, ruleY + 148);
  ctx.fillText('An experimental toy. It removes no fee, tax or limit.', PAD, ruleY + 186);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the card.'))),
      'image/png',
    );
  });
}
