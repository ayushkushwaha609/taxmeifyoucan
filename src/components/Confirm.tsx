import { useMemo, useState } from 'react';
import { formatPaise, parseRupeesToPaise } from '../lib/money';
import { DEFAULT_CHUNK_PAISE, MAX_STEPS, splitPaise } from '../lib/split';
import { payeeLabel, type UpiPayload } from '../lib/upi';

interface Props {
  payload: UpiPayload;
  onConfirm: (totalPaise: number) => void;
  onCancel: () => void;
}

export default function Confirm({ payload, onConfirm, onCancel }: Props) {
  const hadAmount = payload.amountPaise !== undefined;
  const [editing, setEditing] = useState(!hadAmount);
  const [draft, setDraft] = useState(
    payload.amountPaise !== undefined ? String(payload.amountPaise / 100) : '',
  );
  const [totalPaise, setTotalPaise] = useState<number | null>(payload.amountPaise ?? null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const chunks = useMemo(
    () => (totalPaise ? splitPaise(totalPaise, DEFAULT_CHUNK_PAISE) : []),
    [totalPaise],
  );
  const tooMany = chunks.length > MAX_STEPS;
  const name = payeeLabel(payload);

  function commitAmount() {
    const parsed = parseRupeesToPaise(draft);
    if (!parsed.ok) {
      setAmountError(parsed.error);
      return;
    }
    setAmountError(null);
    setTotalPaise(parsed.paise);
    setEditing(false);
  }

  return (
    <div className="screen">
      <p className="eyebrow">Step 2</p>
      <h2 className="section">Who&rsquo;s getting paid</h2>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="payee">
          <div className="payee-mark" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="payee-name">{name}</div>
            <div className="payee-vpa">{payload.pa}</div>
          </div>
        </div>

        <hr
          style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0 18px' }}
        />

        {editing ? (
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="amt">
              {hadAmount ? 'Total amount' : 'This QR has no amount — enter the total'}
            </label>
            <div className="amount-input">
              <span aria-hidden="true">₹</span>
              <input
                id="amt"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitAmount()}
                inputMode="decimal"
                autoComplete="off"
                placeholder="10000"
                autoFocus
              />
            </div>
            {amountError && (
              <p className="fineprint" style={{ color: 'var(--terracotta-deep)', marginTop: 8 }}>
                {amountError}
              </p>
            )}
            <button
              className="btn btn-ghost"
              style={{ marginTop: 14 }}
              onClick={commitAmount}
            >
              Set amount
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Total to pay</p>
            <p className="amount-big">{formatPaise(totalPaise ?? 0)}</p>
            <button className="btn-quiet" onClick={() => setEditing(true)}>
              Edit amount
            </button>
          </>
        )}
      </div>

      {payload.warnings.map((warning) => (
        <div className="note" role="note" key={warning} style={{ marginTop: 14 }}>
          <span aria-hidden="true">⚠</span>
          <span>{warning}</span>
        </div>
      ))}

      {!editing && totalPaise !== null && (
        <div className="card card-tight" style={{ marginTop: 14 }}>
          <p className="eyebrow">
            The split — {chunks.length} {chunks.length === 1 ? 'payment' : 'payments'} of ₹2,000 max
          </p>
          <div className="split-preview">
            {chunks.slice(0, 12).map((paise, i) => (
              <span
                className={`chip${i === chunks.length - 1 && paise !== DEFAULT_CHUNK_PAISE ? ' last' : ''}`}
                key={i}
              >
                {formatPaise(paise)}
              </span>
            ))}
            {chunks.length > 12 && <span className="chip more">+{chunks.length - 12} more</span>}
          </div>
          {chunks.length === 1 && (
            <p className="fineprint" style={{ marginTop: 14 }}>
              Already under ₹2,000 — nothing to split. This is just one normal payment.
            </p>
          )}
        </div>
      )}

      {tooMany && (
        <div className="note error" role="alert" style={{ marginTop: 14 }}>
          <span aria-hidden="true">!</span>
          <span>
            That would be {chunks.length} separate payments. Anything over {MAX_STEPS} steps is
            almost certainly a typo — check the amount.
          </span>
        </div>
      )}

      <div className="grow" />

      <div className="btn-row">
        <button
          className="btn btn-accent"
          disabled={editing || totalPaise === null || tooMany}
          onClick={() => totalPaise !== null && onConfirm(totalPaise)}
        >
          {chunks.length > 1 ? `Make ${chunks.length} payment cards` : 'Continue'}
        </button>
        <button className="btn-quiet" style={{ alignSelf: 'center' }} onClick={onCancel}>
          Scan a different QR
        </button>
      </div>

      <p className="fineprint" style={{ marginTop: 18 }}>
        The UPI ID above comes straight from the QR and is never changed. Check it against the shop
        before you pay.
      </p>
    </div>
  );
}
