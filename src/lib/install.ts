import { useCallback, useEffect, useState } from 'react';

/**
 * Install-to-home-screen support.
 *
 * Chrome on Android fires `beforeinstallprompt` once the app qualifies
 * (HTTPS, manifest, service worker) and lets us defer that prompt to a button
 * of our own. iOS Safari has no such event — there the only route is the
 * Share menu, so we show instructions instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'chhutta.install-dismissed.v1';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad Safari, where installing means Share > Add to Home Screen. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && !otherBrowser;
}

export type InstallState = 'unavailable' | 'ready' | 'ios-manual' | 'installed';

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      // Keep the browser's own mini-infobar out of the way; we have a button.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayMode = (e: MediaQueryListEvent) => setInstalled(e.matches);
    media?.addEventListener?.('change', onDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use either way.
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* storage disabled — it'll just reappear next visit */
    }
  }, []);

  let state: InstallState = 'unavailable';
  if (installed) state = 'installed';
  else if (deferred) state = 'ready';
  else if (isIosSafari()) state = 'ios-manual';

  return { state, install, dismiss, dismissed };
}
