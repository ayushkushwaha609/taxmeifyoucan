import { useState } from 'react';
import { formatPaise } from '../lib/money';
import { maskVpa, payeeLabel, type UpiPayload } from '../lib/upi';
import type { Step } from './Queue';

interface Props {
  payload: UpiPayload;
  steps: Step[];
  onRestart: () => void;
}

export default function Complete({ payload, steps, onRestart }: Props) {
  const [shared, setShared] = useState<string | null>(null);

  const totalPaise = steps.reduce((sum, s) => sum + s.paise, 0);
  const confirmed = steps.filter((s) => s.done);
  const confirmedPaise = confirmed.reduce((sum, s) => sum + s.paise, 0);
  const name = payeeLabel(payload);

  // The share card carries no full UPI ID — the handle is masked.
  async function share() {
    const text =
      `${formatPaise(totalPaise)} to ${name} (${maskVpa(payload.pa)}), ` +
      `broken into ${steps.length} steps. ${confirmed.length} marked paid by hand. ` +
      `Bada payment, chhote steps mein.`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared('Summary copied to your clipboard.');
    } catch {
      setShared('Could not share from this browser.');
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

      {shared && (
        <p className="fineprint" style={{ marginTop: 12 }} role="status">
          {shared}
        </p>
      )}

      <div className="grow" />

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onRestart}>
          Start over
        </button>
        <button className="btn btn-ghost" onClick={share}>
          Share the summary
        </button>
      </div>

      <p className="fineprint" style={{ marginTop: 18 }}>
        Starting over wipes this session from your phone — merchant, amount and all.
      </p>
    </div>
  );
}
