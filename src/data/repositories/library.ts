import type { Area, Card, Deck } from '@/domain/model/records';
import type { JuriDb } from '../db';

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
}

export async function readDeckDetail(db: JuriDb, id: string): Promise<DeckDetail | null> {
  const [deck, areas, cards, itemCount] = await Promise.all([
    db.decks.get(id),
    db.areas.toArray(),
    db.cards.where('deckId').equals(id).toArray(),
    db.reviewItems.where('deckId').equals(id).count(),
  ]);
  return deck ? { deck, areas, cards, itemCount } : null;
}

export interface TodaySnapshot {
  areas: Area[];
  decks: Deck[];
  cardTotal: number;
  itemCounts: Record<string, number>;
  createdAt: number[];
}

/** Grundlage für Heute; `since` ist der Beginn des ersten Tages der letzten Woche. */
export async function readTodaySnapshot(db: JuriDb, since: number): Promise<TodaySnapshot> {
  const [areas, decks, cardTotal, itemKeys, events] = await Promise.all([
    db.areas.toArray(),
    db.decks.toArray(),
    db.cards.count(),
    db.reviewItems.orderBy('deckId').keys(),
    db.events.where('at').aboveOrEqual(since).toArray(),
  ]);
  return {
    areas,
    decks,
    cardTotal,
    itemCounts: countBy(itemKeys),
    // Bisher gibt es nur „Karte angelegt“; mit weiteren Ereignisarten hier nach Typ filtern.
    createdAt: events.map((e) => e.at),
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
    // Bisher gibt es nur „Karte angelegt“; mit weiteren Ereignisarten hier nach Typ filtern.
    db.events.where('at').aboveOrEqual(since).count(),
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
