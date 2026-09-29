/**
 * Verknüpfungen im Schema-Editor (M5, ADR-009): die verknüpfte Karte eines Punkts, Kandidaten für
 * die Auswahl und „Neue Karte anlegen“. Die Oberfläche bekommt diese Dienste als Objekt
 * (`LinkServices`), damit Vorschau und Tests ohne Datenbank auskommen.
 */
import { useMemo } from 'react';
import { cardTitle, CARD_TYPE_LABEL, type CardFields } from '@/domain/cards/card';
import { searchCards } from '@/domain/library/search';
import type { Card, Deck } from '@/domain/model/records';
import { addCard } from './actions';
import { useCard, useSearchData } from './queries';

/** Eine verknüpfbare Karte in der Auswahl: Titel und „Frage · Amtshaftung“. */
export interface LinkTarget {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
}

/** Wie viele Karten die Auswahl ohne Suchwort zeigt (die zuletzt angelegten). */
export const RECENT_CARDS = 5;

export interface LinkServices {
  /** Die verknüpfte Karte; `'missing'`, wenn es sie nicht mehr gibt; `null` beim Laden oder ohne Verknüpfung. */
  useLinked: (id: string | null) => LinkTarget | 'missing' | null;
  /** Treffer zur Suche, ohne Suchwort die zuletzt angelegten Karten; `null` beim Laden. */
  useCandidates: (query: string, selfId: string | undefined) => readonly LinkTarget[] | null;
  /** Legt eine Frage an und liefert ihre Kennung. */
  createCard: (deckId: string, fields: CardFields) => Promise<string>;
}

function target(
  card: Pick<Card, 'id' | 'type' | 'deckId'> & Parameters<typeof cardTitle>[0],
  decks: ReadonlyMap<string, string>,
): LinkTarget {
  const deck = decks.get(card.deckId);
  return {
    id: card.id,
    title: cardTitle(card),
    meta: deck ? `${CARD_TYPE_LABEL[card.type]} · ${deck}` : CARD_TYPE_LABEL[card.type],
  };
}

export const linkServices: LinkServices = {
  useLinked(id) {
    const card = useCard(id);
    const decks = useSearchData(id !== null);
    return useMemo(() => {
      if (id === null || card.status !== 'ready') return null;
      if (card.value === null) return 'missing';
      const names = new Map(
        decks.status === 'ready' ? decks.value.decks.map((d: Deck) => [d.id, d.name]) : [],
      );
      return target(card.value, names);
    }, [id, card, decks]);
  },
  useCandidates(query, selfId) {
    const data = useSearchData(true);
    return useMemo(() => {
      if (data.status !== 'ready') return null;
      const { cards, decks } = data.value;
      const names = new Map(decks.map((d) => [d.id, d.name]));
      const others = cards.filter((c) => c.id !== selfId);
      if (query.trim() === '') {
        return [...others]
          .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
          .slice(0, RECENT_CARDS)
          .map((c) => target(c, names));
      }
      return searchCards(query, others, decks).map((h) => ({
        id: h.id,
        title: h.title,
        meta: `${h.type} · ${names.get(h.deckId) ?? ''}`,
      }));
    }, [data, query, selfId]);
  },
  async createCard(deckId, fields) {
    return (await addCard(deckId, fields)).id;
  },
};
