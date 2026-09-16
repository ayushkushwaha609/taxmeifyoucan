import { useState } from 'react';
import { useInstall } from '../lib/install';

/**
 * Shown on the home screen only when the app can actually be installed, and
 * only until the user says no once.
 */
export default function InstallCard() {
  const { state, install, dismiss, dismissed } = useInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (state === 'installed' || state === 'unavailable' || dismissed) return null;

  return (
    <div className="install-card">
      <div className="install-head">
        <span className="install-mark" aria-hidden="true">
          ⤓
        </span>
        <div>
          <p className="install-title">Keep it on your home screen</p>
          <p className="fineprint">
            Installs like an app — opens full screen, works offline, no store needed.
          </p>
        </div>
        <button className="install-close" onClick={dismiss} aria-label="Not now">
          ×
        </button>
      </div>

      {state === 'ready' ? (
        <button className="btn btn-ghost install-btn" onClick={install}>
          Install Chhutta
        </button>
      ) : (
        <>
          <button
            className="btn btn-ghost install-btn"
            onClick={() => setShowIosSteps((v) => !v)}
            aria-expanded={showIosSteps}
          >
            How to install on iPhone
          </button>
          {showIosSteps && (
            <ol className="install-steps">
              <li>
                Tap the <strong>Share</strong> button in Safari&rsquo;s toolbar
              </li>
              <li>
                Scroll down and choose <strong>Add to Home Screen</strong>
              </li>
              <li>
                Tap <strong>Add</strong>
              </li>
            </ol>
          )}
        </>
      )}
    </div>
  );
}
