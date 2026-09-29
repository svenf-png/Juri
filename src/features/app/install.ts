import { environmentOf, installRequired } from '@/domain/device/environment';
import type { Environment } from '@/domain/device/environment';
import { describeUserAgent, isStandalone } from '@/platform/device';

let cached: boolean | undefined;

/** Gerät dieses Browsers: iPhone/iPad, Desktop oder Android. */
export function currentEnvironment(): Environment {
  return environmentOf(describeUserAgent(navigator.userAgent, navigator.maxTouchPoints).platform);
}

/**
 * Safari-Tab auf iPhone oder iPad? Dann legt Juri keine Daten an und zeigt die
 * Install-Anleitung, weil Safari und die Home-Bildschirm-App getrennte Speicher haben (A13).
 * Auf dem Desktop nie: Dort gibt es kein Sperrbild (Entscheidung 12).
 */
export function needsInstall(): boolean {
  if (cached === undefined) {
    const { platform } = describeUserAgent(navigator.userAgent, navigator.maxTouchPoints);
    cached = installRequired(
      platform,
      isStandalone(navigator as { standalone?: boolean }, (query) => window.matchMedia(query)),
    );
  }
  return cached;
}
