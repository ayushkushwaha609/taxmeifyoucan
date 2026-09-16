import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { parseUpiQr, type UpiPayload } from '../lib/upi';

interface Props {
  /** Open the file picker immediately instead of starting the camera. */
  startWithUpload: boolean;
  onFound: (payload: UpiPayload) => void;
  onCancel: () => void;
}

type CameraState = 'starting' | 'live' | 'denied' | 'unavailable';

export default function Scanner({ startWithUpload, onFound, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const settledRef = useRef(false);

  const [camera, setCamera] = useState<CameraState>(startWithUpload ? 'unavailable' : 'starting');
  const [error, setError] = useState<string | null>(null);

  // Decoding is local: the QR never leaves the device.
  function handleDecoded(text: string) {
    if (settledRef.current) return;
    const result = parseUpiQr(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    settledRef.current = true;
    scannerRef.current?.stop();
    onFound(result.payload);
  }

  useEffect(() => {
    if (startWithUpload) {
      fileRef.current?.click();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable');
      return;
    }

    const scanner = new QrScanner(video, (r) => handleDecoded(r.data), {
      returnDetailedScanResult: true,
      highlightScanRegion: false,
      highlightCodeOutline: false,
      preferredCamera: 'environment',
      maxScansPerSecond: 5,
    });
    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => setCamera('live'))
      .catch((err: unknown) => {
        const name = (err as { name?: string } | null)?.name ?? '';
        setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWithUpload]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      handleDecoded(result.data);
    } catch {
      setError('No QR code could be read in that image. Try a sharper, straight-on photo.');
    }
  }

  const cameraMessage: Record<CameraState, string> = {
    starting: 'Waking up the camera…',
    live: '',
    denied: 'Camera permission was blocked. You can upload a photo of the QR instead.',
    unavailable: 'No camera available here. Upload a photo of the QR instead.',
  };

  return (
    <div className="screen">
      <p className="eyebrow">Step 1</p>
      <h2 className="section">Point at the shop&rsquo;s QR</h2>
      <p className="fineprint">Decoded on your phone. Nothing is uploaded anywhere.</p>

      <div className="scan-frame">
        <video ref={videoRef} playsInline muted />
        {camera === 'live' ? (
          <div className="scan-reticle" />
        ) : (
          <div className="scan-placeholder">
            <span aria-hidden="true" style={{ fontSize: 30 }}>
              ▢
            </span>
            <span>{cameraMessage[camera]}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="note error" role="alert" style={{ marginTop: 16 }}>
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        aria-label="Upload a QR code image"
      />

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          Upload a QR image instead
        </button>
        <button className="btn-quiet" style={{ alignSelf: 'center' }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
