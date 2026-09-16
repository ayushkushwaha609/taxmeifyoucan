import { useEffect, useRef, useState } from 'react';
import { formatPaise } from '../lib/money';
import { payeeLabel, type UpiPayload } from '../lib/upi';
import { renderShareCard } from '../lib/shareCard';
import type { Step } from './Queue';

interface Props {
  payload: UpiPayload;
  steps: Step[];
  onRestart: () => void;
}

export default function Complete({ payload, steps, onRestart }: Props) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const totalPaise = steps.reduce((sum, s) => sum + s.paise, 0);
  const confirmed = steps.filter((s) => s.done);
  const confirmedPaise = confirmed.reduce((sum, s) => sum + s.paise, 0);
  const name = payeeLabel(payload);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    renderShareCard({
      merchant: name,
      totalPaise,
      steps: steps.map((s) => s.paise),
      paidCount: confirmed.length,
    })
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setCardUrl(url);
      })
      .catch(() => {
        if (!cancelled) setStatus('Could not draw the summary card on this browser.');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // The session is finished, so these inputs never change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    const blob = blobRef.current;
    if (!blob) return;

    const file = new File([blob], 'chhutta-summary.png', { type: 'image/png' });
    const caption = `${formatPaise(totalPaise)} in ${steps.length} steps. Bada payment, chhote steps mein.`;

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        return;
      }
    } catch (err) {
      // A cancelled share sheet is not a failure worth reporting.
      if ((err as { name?: string })?.name === 'AbortError') return;
    }

    // No share sheet (desktop, mostly) — hand over the PNG as a download.
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'chhutta-summary.png';
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus('Card saved as chhutta-summary.png.');
    } catch {
      setStatus('Sharing is not available here — long-press the card to save it.');
    }
  }

  return (
    <div className="screen">
      <p className="eyebrow">All steps done</p>
      <h1 className="display">
        Ho gaya.
        <br />
        <em>{confirmed.length} steps,</em> one bill.
      </h1>

      <div className="confetti-rule" aria-hidden="true" />

      <div className="summary-grid">
        <div className="summary-cell">
          <div className="k">Total intended</div>
          <div className="v">{formatPaise(totalPaise)}</div>
        </div>
        <div className="summary-cell">
          <div className="k">Payment steps</div>
          <div className="v">{steps.length}</div>
        </div>
        <div className="summary-cell">
          <div className="k">You marked paid</div>
          <div className="v">
            {confirmed.length}/{steps.length}
          </div>
        </div>
        <div className="summary-cell">
          <div className="k">Confirmed value</div>
          <div className="v">{formatPaise(confirmedPaise)}</div>
        </div>
      </div>

      <div className="note" style={{ marginTop: 18 }}>
        <span aria-hidden="true">i</span>
        <span>
          These numbers are your own manual confirmations — not bank-verified. Check your UPI app or
          statement for what actually went through.
        </span>
      </div>

      <div className="share-card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Your share card
        </p>
        {cardUrl ? (
          <img
            src={cardUrl}
            alt={`Summary card: ${formatPaise(totalPaise)} paid to ${name} in ${steps.length} steps, ${confirmed.length} marked paid.`}
          />
        ) : (
          <div className="share-card-skeleton" aria-hidden="true" />
        )}
        <p className="fineprint" style={{ marginTop: 10 }}>
          No UPI ID on the card — just the shop name. Long-press to save it yourself.
        </p>
      </div>

      {status && (
        <p className="fineprint" style={{ marginTop: 12 }} role="status">
          {status}
        </p>
      )}

      <div className="grow" />

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onRestart}>
          Start over
        </button>
        <button className="btn btn-ghost" onClick={share} disabled={!cardUrl}>
          Share the card
        </button>
      </div>

      <p className="fineprint" style={{ marginTop: 18 }}>
        Starting over wipes this session from your phone — merchant, amount and all.
      </p>
    </div>
  );
}
