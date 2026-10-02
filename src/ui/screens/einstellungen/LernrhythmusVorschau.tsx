import { DEFAULT_LEARNING } from '@/domain/scheduler/settings';
import { DesktopShell } from '../../components/DesktopShell';
import { LernrhythmusView } from './LernrhythmusView';

/** Beispiel „immer Gut“ mit der Formel des Designs (Einstellungen.dc.html, 90 %). */
const EXAMPLES = ['3 T', '→ 9 T', '→ 25 T', '→ 2 Mon', '→ 4 Mon'];

/** Lernrhythmus mit den Beispieldaten des Designs (/styleguide/lernrhythmus), für den Bildvergleich. */
export function LernrhythmusVorschau() {
  return (
    <DesktopShell active="rhythmus">
      <LernrhythmusView
        back={{ to: '/', label: 'Heute' }}
        settings={{ ...DEFAULT_LEARNING, newPerDay: 20 }}
        examples={EXAMPLES}
        deadlines={3}
        onChange={() => undefined}
      />
    </DesktopShell>
  );
}
