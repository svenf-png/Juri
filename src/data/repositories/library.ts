import type { Area, Card, Deck, ReviewItem } from '@/domain/model/records';
import type { LearningSettings } from '@/domain/scheduler/settings';
import type { JuriDb } from '../db';
import { learningDay } from '@/domain/calendar/day';
import { todayDeadlines } from '@/domain/deadlines/list';
import type { DeadlineInput } from '@/domain/today/today';
import { readDeadlines, readOverlay, readScopeWorld } from './deadlines';
import { readSettings, readStudy, reviewedSince, startedSince } from './study';

function countBy(keys: readonly unknown[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of keys) counts[String(key)] = (counts[String(key)] ?? 0) + 1;
  return counts;
}

export interface LibrarySnapshot {
  areas: Area[];
  decks: Deck[];
  cardCounts: Record<string, number>;
  itemCounts: Record<string, number>;
}

/** Rechtsgebiete, Stapel und Mengen je Stapel; liest von den Karten nur den Index. */
export async function readLibrary(db: JuriDb): Promise<LibrarySnapshot> {
  const [areas, decks, cardKeys, itemKeys] = await Promise.all([
    db.areas.toArray(),
    db.decks.toArray(),
    db.cards.orderBy('deckId').keys(),
    db.reviewItems.orderBy('deckId').keys(),
  ]);
  return { areas, decks, cardCounts: countBy(cardKeys), itemCounts: countBy(itemKeys) };
}

export interface DeckDetail {
  deck: Deck;
  areas: Area[];
  cards: Card[];
  itemCount: number;
  /** Abfragen des Stapels mit Lernzustand. */
  items: ReviewItem[];
  settings: LearningSettings;
  startedToday: number;
}

export async function readDeckDetail(
  db: JuriDb,
  id: string,
  todayStart: number,
): Promise<DeckDetail | null> {
  const [deck, areas, cards, items, settings, startedToday, effective] = await Promise.all([
    db.decks.get(id),
    db.areas.toArray(),
    db.cards.where('deckId').equals(id).toArray(),
    db.reviewItems.where('deckId').equals(id).toArray(),
    readSettings(db),
    startedSince(db, todayStart),
    readOverlay(db, todayStart),
  ]);
  return deck
    ? {
        deck,
        areas,
        cards,
        itemCount: items.length,
        items: effective(items),
        settings,
        startedToday,
      }
    : null;
}

export interface TodaySnapshot {
  areas: Area[];
  decks: Deck[];
  cardTotal: number;
  items: ReviewItem[];
  settings: LearningSettings;
  startedToday: number;
  /** Abfragen, die heute mindestens einmal bewertet wurden. */
  reviewedToday: number;
  createdAt: number[];
  /** Kommende Fristen mit „sitzen sicher“ (M8). */
  deadlines: DeadlineInput[];
}

/**
 * Grundlage für Heute; `since` ist der Beginn des ersten Tages der letzten Woche, `todayStart`
 * der Beginn des heutigen Lerntags.
 */
export async function readTodaySnapshot(
  db: JuriDb,
  since: number,
  todayStart: number,
): Promise<TodaySnapshot> {
  const [areas, decks, cardTotal, study, reviewedToday, events, deadlines] = await Promise.all([
    db.areas.toArray(),
    db.decks.toArray(),
    db.cards.count(),
    readStudy(db, todayStart),
    reviewedSince(db, todayStart),
    db.events.where('at').aboveOrEqual(since).toArray(),
    readDeadlines(db),
  ]);
  const world = await readScopeWorld(db, deadlines);
  return {
    areas,
    decks,
    cardTotal,
    items: study.items,
    settings: study.settings,
    startedToday: study.startedToday,
    deadlines: todayDeadlines({
      deadlines,
      items: study.stored,
      world,
      areas,
      decks,
      today: learningDay(new Date(todayStart)),
    }),
    reviewedToday,
    createdAt: events.filter((e) => e.type === 'cardCreated').map((e) => e.at),
  };
}

export interface CreateSnapshot {
  /** Karten, die seit `since` angelegt wurden. */
  madeToday: number;
  total: number;
}

/** Grundlage für Erstellen: Tageszähler und Gesamtzahl. */
export async function readCreateSnapshot(db: JuriDb, since: number): Promise<CreateSnapshot> {
  const [madeToday, total] = await Promise.all([
    db.events
      .where('at')
      .aboveOrEqual(since)
      .filter((e) => e.type === 'cardCreated')
      .count(),
    db.cards.count(),
  ]);
  return { madeToday, total };
}

export interface SearchSnapshot {
  decks: Deck[];
  cards: Card[];
}

export async function readSearchSnapshot(db: JuriDb): Promise<SearchSnapshot> {
  const [decks, cards] = await Promise.all([db.decks.toArray(), db.cards.toArray()]);
  return { decks, cards };
}
