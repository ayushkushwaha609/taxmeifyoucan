import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosSafari, isStandalone } from '../install';

function stubUA(userAgent: string, extra: Record<string, unknown> = {}) {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints: 0, ...extra });
}

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36';

afterEach(() => vi.unstubAllGlobals());

describe('isIosSafari', () => {
  it('is true for Safari on iPhone, where there is no install event', () => {
    stubUA(IPHONE_SAFARI);
    expect(isIosSafari()).toBe(true);
  });

  it('is true for iPadOS, which reports itself as a Mac with a touchscreen', () => {
    stubUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      { maxTouchPoints: 5 },
    );
    expect(isIosSafari()).toBe(true);
  });

  it('is false for other browsers on iOS, which cannot add to the home screen', () => {
    stubUA(IPHONE_CHROME);
    expect(isIosSafari()).toBe(false);
  });

  it('is false on Android and on a real desktop Mac', () => {
    stubUA(ANDROID_CHROME);
    expect(isIosSafari()).toBe(false);
    stubUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    );
    expect(isIosSafari()).toBe(false);
  });
});

describe('isStandalone', () => {
  it('detects an installed app via display-mode', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('navigator', { userAgent: ANDROID_CHROME });
    expect(isStandalone()).toBe(true);
  });

  it('detects an installed app via the iOS-only navigator.standalone flag', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: IPHONE_SAFARI, standalone: true });
    expect(isStandalone()).toBe(true);
  });

  it('is false in a normal browser tab', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: ANDROID_CHROME, standalone: false });
    expect(isStandalone()).toBe(false);
  });
});
