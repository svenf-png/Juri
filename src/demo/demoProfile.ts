import type { BackupTables } from '@/domain/backup/codec';

const DAY = 86_400_000;

/**
 * Demo-Profil der Testinstanz (Entscheidung 10), deterministisch aus `now`.
 * Grundgerüst aus M1: Profil seit 26 Wochen, noch kein Backup (die Erinnerung ist fällig).
 * Lernverlauf, Fristen und Kontakte kommen in M7, M8 und M10 dazu.
 */
export function demoTables(now: number): BackupTables {
  const since = now - 26 * 7 * DAY;
  return {
    profile: [{ id: 'me', name: 'Demo', createdAt: since, updatedAt: since }],
    meta: [{ key: 'onboardedAt', value: since }],
  };
}
