import { describe, expect, it } from 'vitest';
import { describeUserAgent, isStandalone, majorVersion, readSafeAreaInsets } from './device';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15';
const IPAD_LEGACY =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

describe('describeUserAgent', () => {
  it('erkennt iPhone mit iOS-Version', () => {
    expect(describeUserAgent(IPHONE, 5)).toEqual({
      platform: 'iPhone',
      osVersion: '18.2.1',
      safariVersion: '18.2',
      desktopUserAgent: false,
    });
  });

  it('erkennt iPad mit Desktop-Kennung an den Touch-Punkten', () => {
    const info = describeUserAgent(IPAD_DESKTOP, 5);
    expect(info.platform).toBe('iPad');
    expect(info.desktopUserAgent).toBe(true);
    expect(info.osVersion).toBe('18.3');
  });

  it('erkennt einen echten Mac ohne Touch', () => {
    expect(describeUserAgent(IPAD_DESKTOP, 0).platform).toBe('Mac');
  });

  it('erkennt iPad mit mobiler Kennung', () => {
    expect(describeUserAgent(IPAD_LEGACY, 5)).toMatchObject({
      platform: 'iPad',
      osVersion: '17.4',
    });
  });

  it('ordnet andere Geräte ein', () => {
    expect(describeUserAgent('Mozilla/5.0 (Linux; Android 14)', 5).platform).toBe('Android');
    expect(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64)', 0).platform).toBe('Andere');
  });
});

describe('majorVersion', () => {
  it('liest die Hauptversion', () => {
    expect(majorVersion('18.2.1')).toBe(18);
    expect(majorVersion(null)).toBeNull();
    expect(majorVersion('x')).toBeNull();
  });
});

describe('isStandalone', () => {
  it('nutzt navigator.standalone oder display-mode', () => {
    const no = () => ({ matches: false });
    const yes = () => ({ matches: true });
    expect(isStandalone({ standalone: true }, no)).toBe(true);
    expect(isStandalone({}, yes)).toBe(true);
    expect(isStandalone({}, no)).toBe(false);
  });
});

describe('readSafeAreaInsets', () => {
  it('liefert Zahlen und räumt das Messelement weg', () => {
    const before = document.body.childElementCount;
    const insets = readSafeAreaInsets(document);
    expect(Object.values(insets).every((v) => typeof v === 'number')).toBe(true);
    expect(document.body.childElementCount).toBe(before);
  });
});
