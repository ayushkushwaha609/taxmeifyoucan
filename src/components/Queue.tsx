import { useEffect, useRef, useState } from 'react';
import { formatPaise } from '../lib/money';
import { buildUpiIntent, payeeLabel, type UpiPayload } from '../lib/upi';

export interface Step {
  paise: number;
  done: boolean;
}

interface Props {
  payload: UpiPayload;
  steps: Step[];
  activeIndex: number;
  onMarkDone: () => void;
  onAbandon: () => void;
}

export default function Queue({ payload, steps, activeIndex, onMarkDone, onAbandon }: Props) {
  const [launched, setLaunched] = useState(false);
  const [noAppOpened, setNoAppOpened] = useState(false);
  const leftPageRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const active = steps[activeIndex];
  const doneCount = steps.filter((s) => s.done).length;
  const name = payeeLabel(payload);

  // A new card is a clean slate: nothing has been attempted for it yet.
  useEffect(() => {
    setLaunched(false);
    setNoAppOpened(false);
    leftPageRef.current = false;
  }, [activeIndex]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) leftPageRef.current = true;
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function pay() {
    if (!active) return;
    setLaunched(true);
    setNoAppOpened(false);
    leftPageRef.current = false;

    // Hand the URI to the OS and let it choose the UPI app. We never drive it.
    window.location.href = buildUpiIntent(payload, active.paise);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!leftPageRef.current) setNoAppOpened(true);
    }, 2500);
  }

  if (!active) return null;

  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="screen">
      <div className="progress-head">
        <div>
          <p className="eyebrow">Paying {name}</p>
          <p style={{ margin: '4px 0 0', fontWeight: 650 }}>
            <span className="mono-num">
              {activeIndex + 1} of {steps.length}
            </span>{' '}
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>steps</span>
          </p>
        </div>
        <button className="btn-quiet" onClick={onAbandon}>
          Cancel
        </button>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label="Payment steps confirmed"
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="stack">
        {doneCount > 0 && (
          <div className="stack-done">
            {steps.map((step, i) =>
              step.done ? (
                <div className="done-card" key={i}>
                  <span className="tick" aria-hidden="true">
                    ✓
                  </span>
                  <span>Step {i + 1} marked paid</span>
                  <span className="amt mono-num">{formatPaise(step.paise)}</span>
                </div>
              ) : null,
            )}
          </div>
        )}

        <div className={`active-card${activeIndex === steps.length - 1 ? ' solo' : ''}`}>
          <div className="step-label">
            <span className="step-pill">Step {activeIndex + 1}</span>
            <span className="fineprint mono-num">
              {formatPaise(steps.slice(activeIndex).reduce((sum, s) => sum + s.paise, 0))} left
            </span>
          </div>

          <p className="eyebrow">Pay now</p>
          <p className="amount-big">{formatPaise(active.paise)}</p>
          <p className="fineprint" style={{ marginTop: 8, wordBreak: 'break-all' }}>
            to {name} · {payload.pa}
          </p>

          {!launched ? (
            <div className="btn-row" style={{ marginTop: 22 }}>
              <button className="btn btn-accent" onClick={pay}>
                Pay {formatPaise(active.paise)}
              </button>
              <button className="btn-quiet" style={{ alignSelf: 'center' }} onClick={onMarkDone}>
                Already paid this step
              </button>
            </div>
          ) : (
            <>
              <div className="note" style={{ marginTop: 20 }}>
                <span aria-hidden="true">?</span>
                <span>
                  <strong>Did you complete this payment?</strong> We can&rsquo;t see your bank or
                  your UPI app, so only you can say.
                </span>
              </div>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={onMarkDone}>
                  Yes, payment done
                </button>
                <button className="btn btn-ghost" onClick={pay}>
                  Try again
                </button>
              </div>
            </>
          )}

          {noAppOpened && (
            <div className="note error" role="alert" style={{ marginTop: 16 }}>
              <span aria-hidden="true">!</span>
              <span>
                Nothing opened. UPI links only work on a phone with a UPI app installed — and some
                in-app browsers block them. Try opening this page in Chrome, or pay this step
                manually in your UPI app.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grow" />

      <p className="fineprint" style={{ marginTop: 26 }}>
        We never mark a step paid on our own, and we can&rsquo;t confirm anything with your bank.
        &ldquo;Paid&rdquo; here just means you told us so.
      </p>
    </div>
  );
}
