import { useEffect, useRef, useState } from 'react';

/**
 * The fine print, behind an (i) button. A native <dialog> gives us the focus
 * trap, the backdrop and Escape-to-close for free.
 */
export default function About() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        className="info-btn"
        onClick={() => setOpen(true)}
        aria-label="About this app and the fine print"
      >
        <span aria-hidden="true">i</span>
      </button>

      <dialog
        ref={dialogRef}
        className="sheet"
        aria-labelledby="about-title"
        onClose={() => setOpen(false)}
        // Clicking the backdrop (but not the sheet itself) dismisses it.
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
      >
        <div className="sheet-body">
          <div className="sheet-head">
            <h2 id="about-title" className="section" style={{ margin: 0 }}>
              The fine print
            </h2>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <p className="sheet-lede">Experimental concept, built for fun.</p>

          <dl className="sheet-list">
            <dt>Fees and limits</dt>
            <dd>
              Payment fees, limits and rules are decided entirely by your payment provider and the
              merchant — splitting a payment here does not remove any fee, tax, charge or limit.
            </dd>

            <dt>Payment status</dt>
            <dd>
              We can&rsquo;t see your bank or your UPI app. Every step is marked paid by you, by
              hand — nothing here is bank-verified.
            </dd>

            <dt>Your data</dt>
            <dd>Nothing leaves your phone: no account, no server, no QR upload.</dd>
          </dl>

          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
