import { modifierLabel } from '@/domain/device/shortcuts';
import { describeUserAgent } from '@/platform/device';

/** Beschriftung der Strg- oder Cmd-Taste für Tastenhinweise dieses Rechners. */
export function currentModifierLabel(): string {
  return modifierLabel(describeUserAgent(navigator.userAgent, navigator.maxTouchPoints).platform);
}
