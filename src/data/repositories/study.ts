import type { Card, ReviewItem } from '@/domain/model/records';
import type { RatingKey } from '@/domain/scheduler/rating';
import { ratingValue } from '@/domain/scheduler/rating';
import { restoreItem, reviewItem, withActiveDue } from '@/domain/scheduler/schedule';
import { effectiveNewPerDay } from '@/domain/scheduler/dailyLimits';
import { DEFAULT_LEARNING, withDefaults, type LearningSettings } from '@/domain/scheduler/settings';
import type { JuriDb } from '../db';
import { readOverlay, type Overlay } from './deadlines';
import { readGoals, recordActivity } from './progress';

/** Tabellen, die eine Aktivität (Bewertung, Undo, neue Karte) in einer Transaktion schreibt. */
export const ACTIVITY_TABLES = (db: JuriDb) => [
  db.cards,
  db.reviewItems,
  db.reviewLog,
  db.events,
  db.meta,
  db.dayStats,
  db.milestones,
];

/**
 * Einstellungen des Lernrhythmus; fehlt der Eintrag, gelten die Voreinstellungen. Das Tageslimit
 * für neue Karten liegt nie unter dem Tagesziel „Lernen“ (`dailyLimits.ts`), auch nicht bei
 * älteren Ständen oder eingespielten Sicherungen.
 */
export async function readSettings(db: JuriDb): Promise<LearningSettings> {
  const [entry, goals] = await Promise.all([db.meta.get('learning'), readGoals(db)]);
  const stored = entry?.key === 'learning' ? withDefaults(entry.value) : DEFAULT_LEARNING;
  return { ...stored, newPerDay: effectiveNewPerDay(stored.newPerDay, goals.learn) };
}

/**
 * Speichert die Einstellungen. Wechselt der Algorithmus, schreibt dieselbe Transaktion den
 * `due`-Index aller Abfragen neu; FSRS-Zustand und Leitner-Fach bleiben unberührt (ADR-004).
 */
export async function writeSettings(db: JuriDb, next: LearningSettings): Promise<void> {
  await db.transaction('rw', db.meta, db.reviewItems, async () => {
    const before = await readSettings(db);
    const { learn } = await readGoals(db);
    const value = { ...next, newPerDay: effectiveNewPerDay(next.newPerDay, learn) };
    await db.meta.put({ key: 'learning', value });
    if (before.algorithm === next.algorithm) return;
    const items = await db.reviewItems.toArray();
    const changed = items
      .map((item) => withActiveDue(item, next.algorithm))
      .filter((item, i) => item.due !== items[i]?.due);
    await db.reviewItems.bulkPut(changed);
  });
}

/** Neue Abfragen, die seit `since` erstmals bewertet wurden (Tageslimit „Neue Karten“). */
export async function startedSince(db: JuriDb, since: number): Promise<number> {
  return db.reviewLog
    .where('at')
    .aboveOrEqual(since)
    .filter((entry) => entry.wasNew)
    .count();
}

/** Abfragen, die seit `since` mindestens einmal bewertet wurden (Tagesziel „Lernen“, A5). */
export async function reviewedSince(db: JuriDb, since: number): Promise<number> {
  const ids = await db.reviewLog.where('at').aboveOrEqual(since).primaryKeys();
  const entries = await db.reviewLog.bulkGet(ids);
  return new Set(entries.map((e) => e?.itemId)).size;
}

export interface StudySnapshot {
  /** Abfragen mit effektiver Fälligkeit (Fristen eingerechnet). */
  items: ReviewItem[];
  /** Abfragen, wie gespeichert (für „sitzen sicher“, das vom gespeicherten Termin ausgeht). */
  stored: ReviewItem[];
  settings: LearningSettings;
  /** Neue Abfragen, die heute schon begonnen wurden. */
  startedToday: number;
  /** Rechnet die effektive Fälligkeit aus den Fristen neu, z. B. für Abfragen nach einer Bewertung. */
  effective: Overlay;
}

/**
 * Abfragen mit Lernzustand (Fälligkeit effektiv, mit Fristen), Einstellungen und heute begonnene
 * neue Abfragen. Liest alle Abfragen
 * (klein: eine Zeile je Frage oder Lücke); für 5.000 Karten misst M12 nach.
 */
export async function readStudy(db: JuriDb, todayStart: number): Promise<StudySnapshot> {
  const [items, settings, startedToday, effective] = await Promise.all([
    db.reviewItems.toArray(),
    readSettings(db),
    startedSince(db, todayStart),
    readOverlay(db, todayStart),
  ]);
  return { items: effective(items), stored: items, settings, startedToday, effective };
}

/** Wie `readStudy`, aber nur die Abfragen eines Stapels (`deckId`), für eine Lernsession dazu. */
export async function readStudyOf(
  db: JuriDb,
  deckId: string | undefined,
  todayStart: number,
): Promise<StudySnapshot> {
  if (deckId === undefined) return readStudy(db, todayStart);
  const [items, settings, startedToday, effective] = await Promise.all([
    db.reviewItems.where('deckId').equals(deckId).toArray(),
    readSettings(db),
    startedSince(db, todayStart),
    readOverlay(db, todayStart),
  ]);
  return { items: effective(items), stored: items, settings, startedToday, effective };
}

/** Karten zu Karten-IDs; Unbekannte fehlen im Ergebnis. */
export async function readCardsById(db: JuriDb, ids: readonly string[]): Promise<Card[]> {
  const cards = await db.cards.bulkGet([...ids]);
  return cards.filter((card): card is Card => card !== undefined);
}

/**
 * Bewertet Abfragen: Lernzustand, Lernlog und Ereignis „bewertet“ entstehen in einer Transaktion.
 * Eine inzwischen gelöschte Abfrage wird übersprungen.
 */
export async function rateItems(
  db: JuriDb,
  itemIds: readonly string[],
  rating: RatingKey,
  now: number,
): Promise<void> {
  await db.transaction('rw', ACTIVITY_TABLES(db), async () => {
    const settings = await readSettings(db);
    let rated = 0;
    for (const id of itemIds) {
      const item = await db.reviewItems.get(id);
      if (!item) continue;
      const outcome = reviewItem(item, ratingValue(rating), now, settings);
      await db.reviewItems.put(outcome.item);
      await db.reviewLog.add(outcome.log);
      await db.events.add({
        at: now,
        type: 'reviewed',
        cardId: item.cardId,
        deckId: item.deckId,
        itemId: item.id,
        rating: outcome.log.rating,
        first: outcome.log.wasNew,
      });
      rated += 1;
    }
    // Tagesaggregate und Meilensteine in derselben Transaktion (ADR-013).
    if (rated > 0) await recordActivity(db, [now], now);
  });
}

/**
 * Nimmt die letzte Bewertung dieser Abfragen zurück: Der Lernzustand kommt aus dem Lernlog, der
 * Logeintrag entfällt (er würde sonst eine nie gültige Bewertung zählen), das Ereignis-Log bleibt
 * anhängend und bekommt „zurückgenommen“.
 */
export async function undoRating(
  db: JuriDb,
  itemIds: readonly string[],
  now: number,
): Promise<void> {
  await db.transaction('rw', ACTIVITY_TABLES(db), async () => {
    const settings = await readSettings(db);
    const touched: number[] = [];
    for (const id of itemIds) {
      const entry = await db.reviewLog.where('itemId').equals(id).last();
      const item = await db.reviewItems.get(id);
      if (!entry || !item) continue;
      await db.reviewItems.put(withActiveDue(restoreItem(item, entry.before), settings.algorithm));
      await db.reviewLog.delete(entry.seq);
      await db.events.add({
        at: now,
        type: 'reviewUndone',
        cardId: entry.cardId,
        deckId: entry.deckId,
        itemId: entry.itemId,
        rating: entry.rating,
        first: entry.wasNew,
      });
      touched.push(entry.at);
    }
    // Die zurückgenommene Bewertung zählt an ihrem eigenen Tag nicht mehr.
    if (touched.length > 0) await recordActivity(db, [now, ...touched], now);
  });
}
