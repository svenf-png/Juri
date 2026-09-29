import { learningDay } from '@/domain/calendar/day';
import { mediaIdsOf } from '@/domain/cards/card';
import type { Achievements, JuriPackage } from '@/domain/juri/format';
import type { ExportSource } from '@/domain/juri/build';
import type { MergeLocal, MergePlan } from '@/domain/juri/merge';
import type { Card, MediaRecord } from '@/domain/model/records';
import type { JuriDb } from '../db';
import { releaseMedia } from './media';
import { readCounter, writeMeta } from './profile';
import { readErfolge, recordActivity } from './progress';
import { ACTIVITY_TABLES } from './study';

/** Stapel, Rechtsgebiete, Karten und Medien der gewählten Stapel für den Export (M10). */
export async function readExportSource(
  db: JuriDb,
  deckIds: readonly string[],
): Promise<ExportSource> {
  const [decks, areas, cards] = await Promise.all([
    db.decks.toArray(),
    db.areas.toArray(),
    db.cards
      .where('deckId')
      .anyOf([...deckIds])
      .toArray(),
  ]);
  const mediaIds = [...new Set(cards.flatMap(mediaIdsOf))];
  const media = (await db.media.bulkGet(mediaIds)).filter((m): m is MediaRecord => m !== undefined);
  return { decks, areas, cards, media };
}

/**
 * Was für den Abgleich einer Datei nötig ist: alle Stapel und Gebiete, Karten der Datei (nach ID)
 * und alle Karten ihrer Stapel, deren Abfragen, Art und Größe der Medien und die Karten, die es
 * schon einmal gab (Ereignis-Log: angelegt oder importiert).
 */
export async function readMergeLocal(db: JuriDb, pack: JuriPackage): Promise<MergeLocal> {
  const cardIds = pack.cards.map((c) => c.id);
  const [decks, areas] = await Promise.all([db.decks.toArray(), db.areas.toArray()]);
  const known = new Set(decks.map((d) => d.id));
  const deckIds = pack.decks.map((d) => d.id).filter((id) => known.has(id));
  const byId = (await db.cards.bulkGet(cardIds)).filter((c): c is Card => c !== undefined);
  const inDecks = await db.cards.where('deckId').anyOf(deckIds).toArray();
  const cards = new Map([...byId, ...inDecks].map((c) => [c.id, c]));
  const items = await db.reviewItems
    .where('cardId')
    .anyOf([...cards.keys()])
    .toArray();
  const media = (await db.media.bulkGet(pack.media.map((m) => m.id)))
    .filter((m): m is MediaRecord => m !== undefined)
    .map((m) => ({ id: m.id, kind: m.kind, size: m.size }));
  const wanted = new Set(cardIds);
  const knownCardIds = new Set<string>();
  for (const type of ['cardCreated', 'cardImported']) {
    await db.events
      .where('type')
      .equals(type)
      .each((event) => {
        if ('cardId' in event && wanted.has(event.cardId)) knownCardIds.add(event.cardId);
      });
  }
  return { decks, areas, cards: [...cards.values()], items, media, knownCardIds };
}

/**
 * Führt einen Merge-Plan aus: Rechtsgebiete, Stapel, Medien, Karten, Abfragen, Ereignisse, Zähler
 * der Backup-Erinnerung, Tagesaggregate und Meilensteine in EINER Transaktion (ADR-013, ADR-014).
 * Scheitert etwas, bleibt alles unverändert. Ein leerer Plan schreibt nichts.
 */
export async function applyMerge(db: JuriDb, plan: MergePlan, now: number): Promise<void> {
  if (plan.empty) return;
  const w = plan.writes;
  await db.transaction('rw', [...ACTIVITY_TABLES(db), db.areas, db.decks, db.media], async () => {
    if (w.areas.length > 0) await db.areas.bulkAdd([...w.areas]);
    if (w.decks.length > 0) await db.decks.bulkAdd([...w.decks]);
    if (w.media.length > 0) await db.media.bulkAdd([...w.media]);
    if (w.cards.length > 0) await db.cards.bulkPut([...w.cards]);
    if (w.itemsDelete.length > 0) await db.reviewItems.bulkDelete([...w.itemsDelete]);
    if (w.itemsAdd.length > 0) await db.reviewItems.bulkAdd([...w.itemsAdd]);
    if (w.events.length > 0) await db.events.bulkAdd([...w.events]);
    if (w.newCards > 0) {
      await writeMeta(
        db,
        'newCardsSinceBackup',
        (await readCounter(db, 'newCardsSinceBackup')) + w.newCards,
      );
    }
    // Aggregate und Meilensteine neu bewerten (Schema-Baumeister, 100 angelegt zählt Importe nicht).
    await recordActivity(db, [now], now);
    if (w.releaseMedia.length > 0) await releaseMedia(db, w.releaseMedia);
  });
}

/**
 * Vermerkt nach dem Teilen den gemeinsamen Stand der Karten (`originHash`) und das Ereignis
 * `shared` (Kennzahl von „Teamplayer“), in einer Transaktion mit den Meilensteinen.
 */
export async function recordShared(
  db: JuriDb,
  shared: { decks: readonly string[]; hashes: ReadonlyMap<string, string> },
  now: number,
): Promise<void> {
  await db.transaction('rw', ACTIVITY_TABLES(db), async () => {
    const cards = await db.cards.bulkGet([...shared.hashes.keys()]);
    const stamped = cards
      .filter((c): c is Card => c !== undefined)
      .filter((c) => c.originHash !== shared.hashes.get(c.id))
      .map((c) => ({ ...c, originHash: shared.hashes.get(c.id) }));
    if (stamped.length > 0) await db.cards.bulkPut(stamped);
    await db.events.add({
      at: now,
      type: 'shared',
      deckIds: [...shared.decks],
      cards: shared.hashes.size,
    });
    await recordActivity(db, [now], now);
  });
}

/** Erfolgs-Snapshot für die Datei (A9): Serie, Wiederholungen, angelegte Karten, Meilensteine. */
export async function readAchievements(db: JuriDb, now: number): Promise<Achievements> {
  const snapshot = await readErfolge(db, learningDay(new Date(now)));
  return {
    streak: snapshot.streak.current,
    reviews: snapshot.metrics.reviews,
    created: snapshot.metrics.created,
    milestones: [...snapshot.unlocked.keys()],
  };
}
