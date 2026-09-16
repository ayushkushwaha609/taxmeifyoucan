import InstallCard from './InstallCard';
import { CHUNK_LABEL } from '../lib/split';

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
        Scan a shop&rsquo;s UPI QR and we&rsquo;ll break the amount into steps of {CHUNK_LABEL} or less — one card at a
        time, one tap at a time, in whichever UPI app you already use.
      </p>

      <ol className="home-steps">
        <li>Scan or upload the merchant&rsquo;s UPI QR</li>
        <li>Confirm who&rsquo;s getting paid, and how much</li>
        <li>Pay each card in your own UPI app</li>
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

      <InstallCard />

      <div className="grow" />

    </div>
  );
}
