import { useState } from 'react';
import { loadDemoProfile } from '@/features/demo/demo';
import { Button } from '../../components/Button';

/** Testinstanz: ohne Tippen mit dem Demo-Profil starten (Entscheidung 10). */
export function DemoStart() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="md"
      block
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void loadDemoProfile().finally(() => {
          setBusy(false);
        });
      }}
    >
      Mit Demo-Profil starten
    </Button>
  );
}
