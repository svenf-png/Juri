import { useSyncExternalStore } from 'react';
import type { createBrowserRouter } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { isStudyPath, shouldPromptForUpdate, startUpdateChecks } from '@/platform/updateCheck';
import { Button } from './Button';
import { Toast } from './Toast';

/**
 * Meldet eine neue Version, statt still neu zu laden (Briefing B12).
 * Lädt erst nach Tipp auf „Neu laden“, damit keine laufende Lernrunde unterbrochen wird; in der
 * Lernrunde selbst bleibt der Hinweis zurück und erscheint danach (er läge über den Knöpfen).
 * Die Suche nach einer neuen Version stößt `startUpdateChecks` an (Start, Vordergrund).
 */
export function UpdatePrompt({ router }: { router: ReturnType<typeof createBrowserRouter> }) {
  const studying = useSyncExternalStore(
    (notify) => router.subscribe(notify),
    () => isStudyPath(router.state.location.pathname),
  );
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      if (registration) startUpdateChecks(registration, document);
    },
  });

  const controlled = 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
  if (!shouldPromptForUpdate(needRefresh, controlled, studying)) return null;
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
