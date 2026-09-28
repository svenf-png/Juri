/** Erkennung von Gerät, Betriebssystem und Anzeigemodus. */

export interface DeviceInfo {
  platform: 'iPhone' | 'iPad' | 'Mac' | 'Android' | 'Andere';
  osVersion: string | null;
  safariVersion: string | null;
  /** iPadOS meldet sich im Standard als Mac; erkannt an Touch-Punkten. */
  desktopUserAgent: boolean;
}

export function describeUserAgent(ua: string, maxTouchPoints: number): DeviceInfo {
  const os = /OS (\d+)[_.](\d+)(?:[_.](\d+))? like Mac OS X/.exec(ua);
  const safari = /Version\/(\d+(?:\.\d+)*)/.exec(ua);
  const safariVersion = safari?.[1] ?? null;
  const osVersion = os ? [os[1], os[2], os[3]].filter(Boolean).join('.') : null;

  if (/iPhone/.test(ua))
    return { platform: 'iPhone', osVersion, safariVersion, desktopUserAgent: false };
  if (/iPad/.test(ua))
    return { platform: 'iPad', osVersion, safariVersion, desktopUserAgent: false };
  if (/Macintosh/.test(ua)) {
    const touch = maxTouchPoints > 1;
    return {
      platform: touch ? 'iPad' : 'Mac',
      osVersion: touch ? safariVersion : null,
      safariVersion,
      desktopUserAgent: touch,
    };
  }
  if (/Android/.test(ua))
    return { platform: 'Android', osVersion: null, safariVersion: null, desktopUserAgent: false };
  return { platform: 'Andere', osVersion: null, safariVersion, desktopUserAgent: false };
}

/** Hauptversion als Zahl, z. B. „18.2“ → 18. */
export function majorVersion(version: string | null): number | null {
  if (version === null) return null;
  const major = Number.parseInt(version, 10);
  return Number.isNaN(major) ? null : major;
}

/** Läuft Juri als installierte Home-Bildschirm-App? */
export function isStandalone(
  nav: { standalone?: boolean | undefined },
  matchMedia: (query: string) => { matches: boolean },
): boolean {
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Liest env(safe-area-inset-*) über ein unsichtbares Messelement. */
export function readSafeAreaInsets(doc: Document): SafeAreaInsets {
  const probe = doc.createElement('div');
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  for (const side of sides) {
    probe.style.setProperty(`padding-${side}`, `env(safe-area-inset-${side}, 0px)`);
  }
  doc.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const read = (side: (typeof sides)[number]) =>
    Number.parseFloat(style.getPropertyValue(`padding-${side}`)) || 0;
  const result = {
    top: read('top'),
    right: read('right'),
    bottom: read('bottom'),
    left: read('left'),
  };
  probe.remove();
  return result;
}
