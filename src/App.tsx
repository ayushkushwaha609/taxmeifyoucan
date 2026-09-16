import { useCallback, useEffect, useRef, useState } from 'react';
import Home from './components/Home';
import Scanner from './components/Scanner';
import Confirm from './components/Confirm';
import Queue, { type Step } from './components/Queue';
import Complete from './components/Complete';
import About from './components/About';
import { DEFAULT_CHUNK_PAISE, splitPaise } from './lib/split';
import type { UpiPayload } from './lib/upi';

type Screen = 'home' | 'scan' | 'confirm' | 'queue' | 'done';

interface Session {
  payload: UpiPayload;
  steps: Step[];
}

/**
 * Android often tears the page down while the user is off in their UPI app, so
 * the in-flight session is mirrored to sessionStorage. It stays on the device
 * and is wiped the moment the user starts over.
 */
const SESSION_KEY = 'chhutta.session.v1';

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.payload?.pa || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode or storage disabled — the session just won't survive a reload */
  }
}

export default function App() {
  const restored = useRef(loadSession());
  const [screen, setScreen] = useState<Screen>(() => {
    const s = restored.current;
    if (!s) return 'home';
    return s.steps.every((step) => step.done) ? 'done' : 'queue';
  });
  const [uploadFirst, setUploadFirst] = useState(false);
  const [payload, setPayload] = useState<UpiPayload | null>(restored.current?.payload ?? null);
  const [steps, setSteps] = useState<Step[]>(restored.current?.steps ?? []);
  const [undoIndex, setUndoIndex] = useState<number | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    if (payload && steps.length > 0) saveSession({ payload, steps });
  }, [payload, steps]);

  const activeIndex = steps.findIndex((step) => !step.done);

  const clearUndo = useCallback(() => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoIndex(null);
  }, []);

  function reset() {
    clearUndo();
    saveSession(null);
    setPayload(null);
    setSteps([]);
    setScreen('home');
  }

  function handleFound(found: UpiPayload) {
    setPayload(found);
    setScreen('confirm');
  }

  function handleConfirm(totalPaise: number) {
    const chunks = splitPaise(totalPaise, DEFAULT_CHUNK_PAISE);
    setSteps(chunks.map((paise) => ({ paise, done: false })));
    setScreen('queue');
  }

  function markDone() {
    const index = steps.findIndex((step) => !step.done);
    if (index === -1) return;

    const next = steps.map((step, i) => (i === index ? { ...step, done: true } : step));
    setSteps(next);

    // A tap this consequential deserves a way back, briefly.
    setUndoIndex(index);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoIndex(null), 7000);

    if (next.every((step) => step.done)) setScreen('done');
  }

  function undo() {
    if (undoIndex === null) return;
    setSteps((prev) => prev.map((step, i) => (i === undoIndex ? { ...step, done: false } : step)));
    setScreen('queue');
    clearUndo();
  }

  useEffect(() => () => clearUndo(), [clearUndo]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <span className="dot" aria-hidden="true" />
          <span>chhutta</span>
        </div>
        <div className="spacer" />
        {screen !== 'home' && (
          <button className="btn-quiet" onClick={reset}>
            Start over
          </button>
        )}
        <About />
      </header>

      {screen === 'home' && (
        <Home
          onScan={() => {
            setUploadFirst(false);
            setScreen('scan');
          }}
          onUpload={() => {
            setUploadFirst(true);
            setScreen('scan');
          }}
        />
      )}

      {screen === 'scan' && (
        <Scanner
          startWithUpload={uploadFirst}
          onFound={handleFound}
          onCancel={() => setScreen('home')}
        />
      )}

      {screen === 'confirm' && payload && (
        <Confirm payload={payload} onConfirm={handleConfirm} onCancel={() => setScreen('scan')} />
      )}

      {screen === 'queue' && payload && activeIndex !== -1 && (
        <Queue
          payload={payload}
          steps={steps}
          activeIndex={activeIndex}
          onMarkDone={markDone}
          onAbandon={reset}
        />
      )}

      {screen === 'done' && payload && (
        <Complete payload={payload} steps={steps} onRestart={reset} />
      )}

      {undoIndex !== null && (
        <div className="undo-bar" role="status">
          <span>Step {undoIndex + 1} marked paid.</span>
          <button onClick={undo}>Undo</button>
        </div>
      )}
    </div>
  );
}
