import type { ReactNode } from 'react';
import { useMediaQuery } from '../useMediaQuery';
import { AppShell } from './AppShell';
import type { NavKey } from './navigation';

/**
 * Vorschauen der Designs (Bildvergleich) stehen auf dem Handy und dem iPad ohne Rahmen; ab 1280 px
 * (Desktop-Gestaltung, ADR-017) gehört die Sidebar zum Board, also rahmt sie die Vorschau.
 */
export function DesktopShell({ active, children }: { active: NavKey; children: ReactNode }) {
  const desktop = useMediaQuery('(min-width: 1280px)');
  return desktop ? <AppShell active={active}>{children}</AppShell> : <>{children}</>;
}
