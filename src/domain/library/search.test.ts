import { describe, expect, it } from 'vitest';
import type { Card, Deck } from '../model/records';
import { highlight, searchCards, searchTokens, SEARCH_LIMIT } from './search';

const decks: Deck[] = [
  { id: 'd1', name: 'Diebstahl & Betrug', norm: '', areaIds: ['sr'], createdAt: 1, updatedAt: 1 },
  { id: 'd2', name: 'Deliktsrecht', norm: '', areaIds: ['zr'], createdAt: 1, updatedAt: 1 },
];
const base = { norm: '', tags: [] as string[], updatedAt: 1 };
const qaCard: Card = {
  ...base,
  id: 'a',
  deckId: 'd1',
  type: 'qa',
  front: 'Was ist Gewahrsam?',
  back: 'Tatsächliche Sachherrschaft.',
  norm: '§ 242 StGB',
  createdAt: 1,
};
const cards: Card[] = [
  qaCard,
  {
    ...base,
    id: 'b',
    deckId: 'd1',
    type: 'cloze',
    text: 'Wegnahme ist der {{c1::Bruch fremden}} Gewahrsams.',
    createdAt: 2,
    tags: ['Klausur'],
  },
  {
    ...base,
    id: 'c',
    deckId: 'd2',
    type: 'qa',
    front: 'Verjährung nach § 195 BGB',
    back: 'Drei Jahre.',
    createdAt: 3,
  },
];

describe('searchCards', () => {
  it('findet in Vorderseite, Rückseite, Lücken, Norm, Tags und Stapelname', () => {
    expect(
      searchCards('gewahrsam', cards, decks)
        .map((h) => h.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(searchCards('sachherrschaft', cards, decks).map((h) => h.id)).toEqual(['a']);
    expect(searchCards('fremden', cards, decks).map((h) => h.id)).toEqual(['b']);
    expect(searchCards('242', cards, decks).map((h) => h.id)).toEqual(['a']);
    expect(searchCards('#klausur', cards, decks).map((h) => h.id)).toEqual(['b']);
    expect(searchCards('deliktsrecht', cards, decks).map((h) => h.id)).toEqual(['c']);
  });

  it('ignoriert Groß- und Kleinschreibung, Umlaute und ß', () => {
    expect(searchCards('VERJAHRUNG', cards, decks).map((h) => h.id)).toEqual(['c']);
    expect(searchCards('verjährung', cards, decks).map((h) => h.id)).toEqual(['c']);
    expect(searchCards('strasse', [{ ...qaCard, front: 'Straße' }], decks)).toHaveLength(1);
  });

  it('verlangt alle Suchwörter, in beliebiger Reihenfolge, und nichts bei leerer Suche', () => {
    expect(searchCards('bruch gewahrsams', cards, decks).map((h) => h.id)).toEqual(['b']);
    expect(searchCards('gewahrsams bruch', cards, decks).map((h) => h.id)).toEqual(['b']);
    expect(searchCards('gewahrsam verjährung', cards, decks)).toEqual([]);
    expect(searchCards('   ', cards, decks)).toEqual([]);
  });

  it('beschreibt Treffer mit Typ, Titel und Stapel mit Norm oder Tags', () => {
    const hits = searchCards('gewahrsam', cards, decks);
    expect(hits).toEqual([
      {
        id: 'b',
        deckId: 'd1',
        type: 'Lücke',
        title: 'Wegnahme ist der Bruch fremden Gewahrsams.',
        meta: 'Diebstahl & Betrug · #Klausur',
      },
      {
        id: 'a',
        deckId: 'd1',
        type: 'Frage',
        title: 'Was ist Gewahrsam?',
        meta: 'Diebstahl & Betrug · § 242 StGB',
      },
    ]);
    expect(searchCards('verjährung', cards, decks)[0]?.meta).toBe('Deliktsrecht');
  });

  it('stellt Treffer im Titel nach vorn und begrenzt die Anzahl', () => {
    const only: Card[] = [
      { ...qaCard, id: 'x', front: 'Etwas anderes', back: 'Gewahrsam', createdAt: 9 },
      { ...qaCard, id: 'y', front: 'Gewahrsam im Titel', createdAt: 1 },
    ];
    expect(searchCards('gewahrsam', only, decks).map((h) => h.id)).toEqual(['y', 'x']);
    const many = Array.from({ length: SEARCH_LIMIT + 5 }, (_, i) => ({
      ...qaCard,
      id: `m${i}`,
      createdAt: i,
    }));
    expect(searchCards('gewahrsam', many, decks)).toHaveLength(SEARCH_LIMIT);
  });
});

describe('highlight', () => {
  it('markiert Fundstellen im Original', () => {
    expect(highlight('Was ist Gewahrsam?', searchTokens('gewahrsam'))).toEqual([
      { text: 'Was ist ', hit: false },
      { text: 'Gewahrsam', hit: true },
      { text: '?', hit: false },
    ]);
  });

  it('markiert mehrere Wörter und Teilwörter, auch mit Umlauten und ß', () => {
    expect(highlight('Mitgewahrsam ab', ['gewahrsam', 'ab'])).toEqual([
      { text: 'Mit', hit: false },
      { text: 'gewahrsam', hit: true },
      { text: ' ', hit: false },
      { text: 'ab', hit: true },
    ]);
    expect(highlight('Verjährung', searchTokens('verjahrung'))).toEqual([
      { text: 'Verjährung', hit: true },
    ]);
    expect(highlight('Straße', ['ss'])).toEqual([
      { text: 'Stra', hit: false },
      { text: 'ß', hit: true },
      { text: 'e', hit: false },
    ]);
  });

  it('lässt Text ohne Treffer und leere Suchwörter unmarkiert und kommt mit Emoji zurecht', () => {
    expect(highlight('abc', [''])).toEqual([{ text: 'abc', hit: false }]);
    expect(highlight('', ['a'])).toEqual([]);
    expect(highlight('a 😀 b', ['😀'])).toEqual([
      { text: 'a ', hit: false },
      { text: '😀', hit: true },
      { text: ' b', hit: false },
    ]);
  });
});
