import type { BackupTables } from '@/domain/backup/codec';
import { addDays, dayKey, learningDay } from '@/domain/calendar/day';
import type { Deadline } from '@/domain/model/records';
import { demoDeckTables } from './demoDecks';

const DAY = 86_400_000;

/** Drei Fristen des Demo-Profils, relativ zum Lerntag von `now` (M8). */
export function demoDeadlines(now: number): Deadline[] {
  const today = learningDay(new Date(now));
  const base = { createdAt: now - 14 * DAY, updatedAt: now - 14 * DAY };
  return [
    {
      ...base,
      id: 'demo-frist-klausur',
      kind: 'klausur',
      name: 'Zivilrecht, AG-Klausur',
      date: dayKey(addDays(today, 5)),
      scope: { all: false, areaIds: ['demo-zr'], deckIds: [], tags: [] },
      sprint: true,
    },
    {
      ...base,
      id: 'demo-frist-llm',
      kind: 'llm',
      name: 'Modul Vertragsrecht',
      date: dayKey(addDays(today, 109)),
      scope: { all: false, areaIds: [], deckIds: [], tags: ['Demo'] },
      sprint: false,
    },
    {
      ...base,
      id: 'demo-frist-examen',
      kind: 'exam',
      name: '2. Staatsexamen, schriftlich',
      scope: { all: true, areaIds: [], deckIds: [], tags: [] },
      sprint: true,
    },
  ];
}

/**
 * Demo-Profil der Testinstanz (Entscheidung 10), deterministisch aus `now`.
 * Grundgerüst aus M1: Profil seit 26 Wochen, noch kein Backup (die Erinnerung ist fällig).
 * Seit M3 mit den Demo-Stapeln (40 Karten, über 26 Wochen angelegt), seit M8 mit drei Fristen:
 * eine im Endspurt (Klausur in 5 Tagen), eine später (LL.M. in 109 Tagen, Umfang über den Tag
 * „Demo“) und eine ohne Datum (Examen). Lernverlauf und Kontakte kommen in M9 und M11 dazu.
 */
export function demoTables(now: number): BackupTables {
  const since = now - 26 * 7 * DAY;
  return {
    ...demoDeckTables(now),
    deadlines: demoDeadlines(now),
    profile: [{ id: 'me', name: 'Demo', createdAt: since, updatedAt: since }],
    meta: [{ key: 'onboardedAt', value: since }],
  };
}
