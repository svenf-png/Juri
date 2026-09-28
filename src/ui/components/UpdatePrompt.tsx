import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';
import { Toast } from './Toast';

/**
 * Meldet eine neue Version, statt still neu zu laden (Briefing B12).
 * Lädt erst nach Tipp auf „Neu laden“, damit keine laufende Lernrunde unterbrochen wird.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  if (!needRefresh) return null;
  return (
    <Toast title="Neue Version verfügbar" sub="Deine Daten bleiben erhalten.">
      <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
        Später
      </Button>
      <Button variant="ink" size="sm" onClick={() => void updateServiceWorker(true)}>
        Neu laden
      </Button>
    </Toast>
  );
}
