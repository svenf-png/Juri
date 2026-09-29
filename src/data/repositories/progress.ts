import { dayKey, dayStart, learningDay, parseDayKey, type Day } from '@/domain/calendar/day';
import type { DayRow } from '@/domain/model/records';
import {
  availableDays,
  openSpans,
  type ItemHistory,
  type LogPoint,
} from '@/domain/progress/availability';
import { DEFAULT_GOALS, withDefaultGoals, type Goals } from '@/domain/progress/goals';
import {
  MILESTONES,
  NO_METRICS,
  newlyReached,
  type Metrics,
  type Unlock,
} from '@/domain/progress/milestones';
import { rowOf } from '@/domain/progress/rows';
import { effectiveNewPerDay } from '@/domain/scheduler/dailyLimits';
import { DEFAULT_LEARNING, withDefaults } from '@/domain/scheduler/settings';
import { dayOfTime, dayStats } from '@/domain/progress/stats';
import { streak, NO_STREAK, type StreakResult } from '@/domain/progress/streak';
import type { JuriDb } from '../db';

/** Tagesziele; fehlt der Eintrag, gelten die Voreinstellungen. */
export async function readGoals(db: JuriDb): Promise<Goals> {
  const entry = await db.meta.get('goals');
  return entry?.key === 'goals' ? withDefaultGoals(entry.value) : DEFAULT_GOALS;
}

/** Ein Tag mit dem Zustand vor und nach einer Änderung der Aggregate. */
export interface DayChange {
  readonly day: string;
  readonly before: DayRow | undefined;
  readonly after: DayRow | undefined;
}

/**
 * Rechnet die Datensätze der Tage `keys` aus dem Ereignis-Log neu. Läuft in der Transaktion, die
 * das Ereignis schreibt (Bewertung, Undo, neue Karte): `events`, `dayStats` und `meta` müssen
 * dazugehören. Tage ohne Aktivität verlieren ihren Datensatz. Für einen Tag, dessen Datensatz
 * schon besteht, bleibt `met` erhalten, solange sich die Zahlen nicht ändern (spätere Änderungen
 * der Ziele wirken nur auf neue Zahlen).
 */
export async function refreshDays(db: JuriDb, keys: Iterable<string>): Promise<DayChange[]> {
  const days = [...new Set(keys)].sort();
  const earliest = days[0];
  if (earliest === undefined) return [];
  const [goals, events] = await Promise.all([
    readGoals(db),
    db.events
      .where('at')
      .aboveOrEqual(dayStart(parseDayKey(earliest)).getTime())
      .toArray(),
  ]);
  const stats = dayStats(events);
  const changes: DayChange[] = [];
  for (const day of days) {
    const before = await db.dayStats.get(day);
    const s = stats.get(day);
    let after: DayRow | undefined;
    if (s && (s.reviews > 0 || s.created > 0)) {
      const fresh = rowOf(day, s, goals);
      const same =
        before !== undefined &&
        before.reviews === s.reviews &&
        before.learned === s.learned &&
        before.created === s.created;
      after = same ? before : fresh;
      await db.dayStats.put(after);
    } else {
      await db.dayStats.delete(day);
    }
    changes.push({ day, before, after });
  }
  return changes;
}

/**
 * Speichert die Ziele; der heutige Tag wird nach den neuen Zielen bewertet, frühere bleiben.
 * Ein Ziel über dem Tageslimit für neue Karten hebt das Limit mit an (`dailyLimits.ts`).
 */
export async function writeGoals(db: JuriDb, goals: Goals, now: number): Promise<void> {
  await db.transaction('rw', db.meta, db.dayStats, async () => {
    await db.meta.put({ key: 'goals', value: goals });
    const entry = await db.meta.get('learning');
    const learning = entry?.key === 'learning' ? withDefaults(entry.value) : DEFAULT_LEARNING;
    const limit = effectiveNewPerDay(learning.newPerDay, goals.learn);
    if (limit !== learning.newPerDay) {
      await db.meta.put({ key: 'learning', value: { ...learning, newPerDay: limit } });
    }
    const today = dayKey(learningDay(new Date(now)));
    const row = await db.dayStats.get(today);
    if (row) await db.dayStats.put(rowOf(today, row, goals));
  });
}

/** Die Streckenform für die Verfügbarkeit: pro Abfrage die Lernlog-Punkte. */
async function histories(db: JuriDb): Promise<ItemHistory[]> {
  const items = await db.reviewItems.toArray();
  const log = await db.reviewLog.toArray();
  const byItem = new Map<string, LogPoint[]>();
  for (const entry of log) {
    const list = byItem.get(entry.itemId) ?? [];
    list.push({ at: entry.at, dueBefore: entry.before.due });
    byItem.set(entry.itemId, list);
  }
  return items.map((item) => ({
    createdAt: item.createdAt,
    due: item.due,
    log: byItem.get(item.id) ?? [],
  }));
}

/** Serie bis `today`; das Lernlog wird nur gelesen, wenn es verpasste Tage gibt. */
export async function readStreak(
  db: JuriDb,
  today: Day,
  goals: Goals,
  rows?: readonly DayRow[],
): Promise<StreakResult> {
  const all = rows ?? (await db.dayStats.toArray());
  const met = new Map(all.map((row) => [row.day, row.met]));
  const probing = { asked: false };
  const probe = streak({
    met,
    today,
    pause: goals.pause,
    available: () => {
      probing.asked = true;
      return true;
    },
  });
  if (!probing.asked) return probe;
  const first = [...met.keys()].sort()[0];
  if (first === undefined) return NO_STREAK;
  const days = availableDays((await histories(db)).flatMap(openSpans), parseDayKey(first), today);
  return streak({ met, today, pause: goals.pause, available: (key) => days.has(key) });
}

/** Kennzahlen der Meilensteine; die Serie nur, wenn `withStreak` (sie ist die teuerste). */
async function readMetrics(
  db: JuriDb,
  rows: readonly DayRow[],
  today: Day,
  withStreak: boolean,
): Promise<Metrics> {
  let created = 0;
  let reviews = 0;
  for (const row of rows) {
    created += row.created;
    reviews += row.reviews;
  }
  const goals = withStreak ? await readGoals(db) : DEFAULT_GOALS;
  return {
    ...NO_METRICS,
    created,
    reviews,
    schemas: await db.cards.where('type').equals('schema').count(),
    streak: withStreak ? (await readStreak(db, today, goals, rows)).current : 0,
  };
}

/**
 * Schaltet erreichte Meilensteine frei, genau einmal: Was schon in `milestones` steht, bleibt
 * unangetastet. Läuft in der Transaktion der Aktivität (`cards`, `reviewItems`, `reviewLog`,
 * `dayStats`, `milestones` und `meta` müssen dazugehören). Die Serie wird nur geprüft, wenn ein
 * Serien-Meilenstein noch offen ist und `checkStreak` gesetzt ist.
 */
export async function unlockMilestones(
  db: JuriDb,
  now: number,
  checkStreak: boolean,
): Promise<string[]> {
  const unlocked = new Set(await db.milestones.toCollection().primaryKeys());
  if (MILESTONES.every((m) => unlocked.has(m.id))) return [];
  const streakOpen = MILESTONES.some((m) => m.metric === 'streak' && !unlocked.has(m.id));
  const rows = await db.dayStats.toArray();
  const metrics = await readMetrics(
    db,
    rows,
    learningDay(new Date(now)),
    checkStreak && streakOpen,
  );
  const fresh = newlyReached(metrics, unlocked);
  if (fresh.length > 0) {
    await db.milestones.bulkAdd(fresh.map((m) => ({ id: m.id, unlockedAt: now, seen: false })));
  }
  return fresh.map((m) => m.id);
}

/**
 * Aggregate und Meilensteine nach einer Änderung im Ereignis-Log: `at` sind die Zeitpunkte der
 * betroffenen Ereignisse (bei Undo auch der der zurückgenommenen Bewertung). Gehört in dieselbe
 * Transaktion wie das Ereignis (ADR-013).
 */
export async function recordActivity(
  db: JuriDb,
  at: readonly number[],
  now: number,
): Promise<void> {
  const changes = await refreshDays(db, at.map(dayOfTime));
  const today = dayOfTime(now);
  const becameMet = changes.some(
    (c) => c.day === today && c.before?.met !== true && c.after?.met === true,
  );
  await unlockMilestones(db, now, becameMet);
}

export interface ErfolgeSnapshot {
  rows: DayRow[];
  goals: Goals;
  streak: StreakResult;
  metrics: Metrics;
  unlocked: Map<string, Unlock>;
}

/** Alles, was Erfolge zeigt. */
export async function readErfolge(db: JuriDb, today: Day): Promise<ErfolgeSnapshot> {
  const [rows, goals, records] = await Promise.all([
    db.dayStats.toArray(),
    readGoals(db),
    db.milestones.toArray(),
  ]);
  const [streakResult, metrics] = await Promise.all([
    readStreak(db, today, goals, rows),
    readMetrics(db, rows, today, false),
  ]);
  return {
    rows,
    goals,
    streak: streakResult,
    metrics: { ...metrics, streak: streakResult.current },
    unlocked: new Map(records.map((r) => [r.id, { unlockedAt: r.unlockedAt, seen: r.seen }])),
  };
}

/** Markiert Meilensteine als gefeiert. */
export async function markSeen(db: JuriDb, ids: readonly string[]): Promise<void> {
  await db.transaction('rw', db.milestones, async () => {
    for (const id of ids) await db.milestones.update(id, { seen: true });
  });
}

/**
 * Schaltet Meilensteine frei, die der Verlauf schon erreicht hat, ohne dass eine Aktivität sie
 * ausgelöst hat (nach einem Update oder Backup); Erfolge ruft es beim Öffnen.
 */
export async function syncMilestones(db: JuriDb, now: number): Promise<string[]> {
  return db.transaction(
    'rw',
    [db.cards, db.reviewItems, db.reviewLog, db.dayStats, db.milestones, db.meta],
    async () => await unlockMilestones(db, now, true),
  );
}

/** Der heutige Stand für die Feier am Ende einer Session. */
export interface CelebrationSnapshot {
  rows: DayRow[];
  goals: Goals;
  streak: number;
  /** Meilensteine mit ausstehender Feier. */
  fresh: string[];
}

/** Gelernte Abfragen des Tages (Tagesziel „Lernen“) und die Ziele, beim Start einer Session. */
export async function readGoalStart(
  db: JuriDb,
  dayKeyToday: string,
): Promise<{ learned: number; goals: Goals }> {
  const [row, goals] = await Promise.all([db.dayStats.get(dayKeyToday), readGoals(db)]);
  return { learned: row?.learned ?? 0, goals };
}

/** Stand nach einer Session; die Aggregate sind in derselben Transaktion wie die Bewertungen geschrieben. */
export async function readCelebration(db: JuriDb, today: Day): Promise<CelebrationSnapshot> {
  const [rows, goals, records] = await Promise.all([
    db.dayStats.toArray(),
    readGoals(db),
    db.milestones.filter((m) => !m.seen).toArray(),
  ]);
  const result = await readStreak(db, today, goals, rows);
  return { rows, goals, streak: result.current, fresh: records.map((m) => m.id) };
}
