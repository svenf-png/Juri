import { learningDay, type Day } from '@/domain/calendar/day';
import { activeDeadlines, applyDeadlines } from '@/domain/deadlines/effective';
import { scopeTags, type ScopeWorld } from '@/domain/deadlines/scope';
import type { Area, Deadline, Deck, ReviewItem } from '@/domain/model/records';
import type { JuriDb } from '../db';

/** Alle Fristen; es sind nur wenige. Die Reihenfolge legt domain/deadlines/list.ts fest. */
export async function readDeadlines(db: JuriDb): Promise<Deadline[]> {
  return db.deadlines.toArray();
}

export type NewDeadline = Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>;

export async function createDeadline(
  db: JuriDb,
  id: string,
  input: NewDeadline,
  now: number,
): Promise<Deadline> {
  const deadline: Deadline = { ...input, id, createdAt: now, updatedAt: now };
  await db.deadlines.add(deadline);
  return deadline;
}

/** Ersetzt die Angaben einer Frist; `null`, wenn es sie nicht mehr gibt. */
export async function updateDeadline(
  db: JuriDb,
  id: string,
  input: NewDeadline,
  now: number,
): Promise<Deadline | null> {
  return db.transaction('rw', db.deadlines, async () => {
    const current = await db.deadlines.get(id);
    if (!current) return null;
    const next: Deadline = { ...input, id, createdAt: current.createdAt, updatedAt: now };
    await db.deadlines.put(next);
    return next;
  });
}

/** Löscht die Frist; Karten und Lernstand bleiben unberührt (Fristen ändern nichts Gespeichertes). */
export async function deleteDeadline(db: JuriDb, id: string): Promise<boolean> {
  return db.transaction('rw', db.deadlines, async () => {
    const found = (await db.deadlines.get(id)) !== undefined;
    await db.deadlines.delete(id);
    return found;
  });
}

/** Stapel und Tags der Karten, soweit die Umfänge sie brauchen. */
export async function readScopeWorld(
  db: JuriDb,
  deadlines: readonly Deadline[],
): Promise<ScopeWorld> {
  const [decks, byTag] = await Promise.all([
    db.decks.toArray(),
    Promise.all(
      scopeTags(deadlines).map(async (tag) => {
        const cards = await db.cards.where('tags').equals(tag).toArray();
        return cards.map((card) => [card.id, card.tags] as const);
      }),
    ),
  ]);
  return { decks, cardTags: new Map(byTag.flat()) };
}

export type Overlay = (items: readonly ReviewItem[]) => ReviewItem[];

/**
 * Effektive Fälligkeit für den Lerntag, der um `todayStart` beginnt (domain/deadlines/effective.ts).
 * Liest die Fristen einmal und liefert eine reine Funktion für beliebige Abfragen; ohne aktive
 * Frist ist sie die Identität. Es wird nichts geschrieben.
 */
export async function readOverlay(db: JuriDb, todayStart: number): Promise<Overlay> {
  const today: Day = learningDay(new Date(todayStart));
  const deadlines = await readDeadlines(db);
  if (activeDeadlines(deadlines, today).length === 0) return (items) => [...items];
  const world = await readScopeWorld(db, deadlines);
  return (items) => applyDeadlines(items, deadlines, world, today);
}

export interface DeadlinesSnapshot {
  deadlines: Deadline[];
  /** Abfragen, wie gespeichert (für „sitzen sicher“). */
  items: ReviewItem[];
  world: ScopeWorld;
  areas: Area[];
  decks: Deck[];
  /** Alle Tags der Karten, für die Auswahl im Umfang. */
  tags: string[];
}

/** Grundlage für den Fristen-Bildschirm: Fristen, Abfragen, Umfang und Auswahlmöglichkeiten. */
export async function readDeadlinesSnapshot(db: JuriDb): Promise<DeadlinesSnapshot> {
  const [deadlines, items, areas, decks, tags] = await Promise.all([
    readDeadlines(db),
    db.reviewItems.toArray(),
    db.areas.toArray(),
    db.decks.toArray(),
    db.cards.orderBy('tags').uniqueKeys(),
  ]);
  const world = await readScopeWorld(db, deadlines);
  return { deadlines, items, world, areas, decks, tags: tags.map(String).sort() };
}
