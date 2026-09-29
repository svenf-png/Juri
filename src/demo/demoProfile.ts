import type { BackupTables } from '@/domain/backup/codec';
import { addDays, dayKey, dayStart, learningDay } from '@/domain/calendar/day';
import type { Deadline, MilestoneRecord, NewEvent, ReviewItem } from '@/domain/model/records';
import { DEFAULT_GOALS } from '@/domain/progress/goals';
import { MILESTONES, newlyReached } from '@/domain/progress/milestones';
import { dayRows } from '@/domain/progress/rows';
import { streak } from '@/domain/progress/streak';
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

/** Zufallsfolge wie in den Designs (deterministisch aus dem Startwert). */
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** Bewertungen am Tag `ago` Tage vor heute: 0 = verpasst, sonst die Zahl der Bewertungen. */
export function demoDayReviews(ago: number, random: () => number): number {
  if (ago === 0) return 6;
  // Der Rekordtag vor acht Tagen (Rekord: 86 Wiederholungen).
  if (ago === 8) return 86;
  const r = random();
  // Die letzten drei Wochen: jeden Tag aktiv, nur ein Tag pro Woche frei (Pausentag).
  if (ago <= 21) return ago % 7 === 3 ? 0 : 26 + Math.floor(r * 30);
  // Davor mit Lücken (die Serie bricht), sonst locker.
  if (ago <= 35) return r < 0.4 ? 0 : 12 + Math.floor(r * 40);
  return r < 0.45 ? 0 : 6 + Math.floor(r * 34);
}

/**
 * Lernverlauf des Demo-Profils (M9): Bewertungen über 26 Wochen, die nur Abfragen treffen, die
 * es an dem Tag schon gab. Liefert die Ereignisse (mit den Anlege-Ereignissen der Stapel) in der
 * Reihenfolge des Logs.
 */
function demoEvents(now: number, base: readonly NewEvent[], items: readonly ReviewItem[]) {
  const today = learningDay(new Date(now));
  const random = lcg(42);
  const out: NewEvent[] = base.map((event) => {
    const copy: Record<string, unknown> = { ...event };
    delete copy.seq;
    return copy as unknown as NewEvent;
  });
  for (let ago = 26 * 7; ago >= 0; ago--) {
    const count = demoDayReviews(ago, random);
    if (count === 0) continue;
    const begin = dayStart(addDays(today, -ago)).getTime();
    const end = ago === 0 ? now : begin + 14 * 3_600_000;
    const alive = items.filter((item) => item.createdAt <= begin);
    if (alive.length === 0) continue;
    for (let i = 0; i < count; i++) {
      const item = alive[i % alive.length];
      if (!item) continue;
      out.push({
        at: begin + Math.floor(((end - begin) * (i + 1)) / (count + 1)),
        type: 'reviewed',
        cardId: item.cardId,
        deckId: item.deckId,
        itemId: item.id,
        rating: 3,
        first: false,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at).map((event, i) => ({ ...event, seq: i + 1 }));
}

/** Meilensteine des Demo-Profils: erreichte, mit Zeitpunkt; „1.000 Wiederholungen“ wartet auf die Feier. */
function demoMilestones(
  now: number,
  events: readonly { at: number; type: string }[],
  rows: readonly { day: string; reviews: number; created: number; met: boolean }[],
  schemas: number,
): MilestoneRecord[] {
  const today = learningDay(new Date(now));
  const met = new Map(rows.map((row) => [row.day, row.met]));
  const current = streak({ met, today, pause: true, available: () => true }).current;
  const metrics = {
    created: rows.reduce((sum, row) => sum + row.created, 0),
    reviews: rows.reduce((sum, row) => sum + row.reviews, 0),
    schemas,
    streak: current,
  };
  const reached = newlyReached(metrics, new Set(), MILESTONES);
  const nth = (type: string, n: number) => events.filter((e) => e.type === type)[n - 1]?.at ?? now;
  return reached.map((m) => ({
    id: m.id,
    unlockedAt:
      m.metric === 'created'
        ? nth('cardCreated', m.target)
        : m.metric === 'reviews'
          ? nth('reviewed', m.target)
          : dayStart(addDays(today, -(current - m.target))).getTime() + 12 * 3_600_000,
    seen: m.id !== 'wiederholungen-1000',
  }));
}

/**
 * Demo-Profil der Testinstanz (Entscheidung 10), deterministisch aus `now`.
 * Grundgerüst aus M1: Profil seit 26 Wochen, noch kein Backup (die Erinnerung ist fällig).
 * Seit M3 mit den Demo-Stapeln (40 Karten, über 26 Wochen angelegt), seit M8 mit drei Fristen:
 * eine im Endspurt (Klausur in 5 Tagen), eine später (LL.M. in 109 Tagen, Umfang über den Tag
 * „Demo“) und eine ohne Datum (Examen). Seit M9 mit 26 Wochen Lernverlauf: Rekordtag vor acht
 * Tagen (86 Wiederholungen), Pausentage, laufender Serie, freigeschalteten und fast erreichten
 * Meilensteinen. Kontakte kommen in M11 dazu.
 */
export function demoTables(now: number): BackupTables {
  const since = now - 26 * 7 * DAY;
  const decks = demoDeckTables(now);
  const events = demoEvents(
    now,
    (decks.events ?? []) as unknown as NewEvent[],
    (decks.reviewItems ?? []) as unknown as ReviewItem[],
  );
  const rows = dayRows(events, DEFAULT_GOALS);
  const schemas = (decks.cards ?? []).filter((card) => card.type === 'schema').length;
  return {
    ...decks,
    events: events,
    dayStats: rows,
    milestones: demoMilestones(now, events, rows, schemas),
    deadlines: demoDeadlines(now),
    profile: [{ id: 'me', name: 'Demo', createdAt: since, updatedAt: since }],
    meta: [{ key: 'onboardedAt', value: since }],
  };
}
