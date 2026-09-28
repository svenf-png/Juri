import { describeUserAgent, isStandalone } from '@/platform/device';

let cached: boolean | undefined;

/**
 * Safari-Tab auf iPhone oder iPad? Dann legt Juri keine Daten an und zeigt die
 * Install-Anleitung, weil Safari und die Home-Bildschirm-App getrennte Speicher haben (A13).
 */
export function needsInstall(): boolean {
  if (cached === undefined) {
    const { platform } = describeUserAgent(navigator.userAgent, navigator.maxTouchPoints);
    const mobile = platform === 'iPhone' || platform === 'iPad';
    cached =
      mobile &&
      !isStandalone(navigator as { standalone?: boolean }, (query) => window.matchMedia(query));
  }
  return cached;
}
