interface Props {
  onScan: () => void;
  onUpload: () => void;
}

export default function Home({ onScan, onUpload }: Props) {
  return (
    <div className="screen home-hero">
      <p className="eyebrow">Experimental payment-flow toy</p>
      <h1 className="display">
        Bada payment?
        <br />
        <em>Chhote steps mein.</em>
      </h1>

      <p className="lede">
        Scan a shop&rsquo;s UPI QR and we&rsquo;ll break the amount into ₹2,000 steps — one card at a
        time, one tap at a time, in whichever UPI app you already use.
      </p>

      <ol className="home-steps">
        <li>Scan or upload the merchant&rsquo;s UPI QR</li>
        <li>Confirm who&rsquo;s getting paid, and how much</li>
        <li>Pay each ₹2,000 card in your own UPI app</li>
        <li>Tap &ldquo;Paid&rdquo; yourself — we never guess</li>
      </ol>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onScan}>
          Scan QR
        </button>
        <button className="btn btn-ghost" onClick={onUpload}>
          Upload a QR image
        </button>
      </div>

      <div className="grow" />

      <div className="disclaimer">
        <p className="fineprint">
          Experimental concept, built for fun. Payment fees, limits and rules are decided entirely by
          your payment provider and the merchant — splitting a payment here does not remove any fee,
          tax, charge or limit. Nothing leaves your phone: no account, no server, no QR upload.
        </p>
      </div>
    </div>
  );
}
