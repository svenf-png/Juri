import { describe, expect, it } from 'vitest';
import type { Card } from '../model/records';
import {
  cardTitle,
  checkCard,
  contentOf,
  formFromCard,
  formatTags,
  normalizeTags,
  reviewItemId,
  reviewSubs,
  tidyLine,
  type CardForm,
} from './card';

const qa: CardForm = {
  type: 'qa',
  front: ' Was ist Gewahrsam? ',
  back: ' Sachherrschaft. ',
  text: '',
  norm: ' § 242  StGB ',
  tags: '#Klausur #AG',
};
const cloze: CardForm = {
  type: 'cloze',
  front: '',
  back: '',
  text: 'A {{c1::b}} {{c2::c}}',
  norm: '',
  tags: '',
};

describe('normalizeTags', () => {
  it('trennt an Leerraum und Komma, entfernt „#“ und Doppelte ohne Rücksicht auf Groß- und Kleinschreibung', () => {
    expect(normalizeTags('#Klausur, #AG  klausur ##Examen# #')).toEqual([
      'Klausur',
      'AG',
      'Examen',
    ]);
    expect(normalizeTags('')).toEqual([]);
  });

  it('kürzt lange Tags, verwirft Tags mit „#“ in der Mitte und begrenzt die Anzahl', () => {
    expect(normalizeTags('a'.repeat(50))[0]).toHaveLength(40);
    expect(normalizeTags('a#b')).toEqual([]);
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(' ');
    expect(normalizeTags(many)).toHaveLength(20);
  });

  it('formatiert für das Eingabefeld', () => {
    expect(formatTags(['Klausur', 'AG'])).toBe('#Klausur #AG');
    expect(formatTags([])).toBe('');
  });
});

describe('tidyLine', () => {
  it('fasst Leerraum zusammen und kürzt', () => {
    expect(tidyLine('  a \n b  ', 10)).toBe('a b');
    expect(tidyLine('abcdef ', 3)).toBe('abc');
  });
});

describe('checkCard', () => {
  it('bereinigt eine Frage', () => {
    expect(checkCard(qa)).toEqual({
      ok: true,
      fields: {
        content: { type: 'qa', front: 'Was ist Gewahrsam?', back: 'Sachherrschaft.' },
        norm: '§ 242 StGB',
        tags: ['Klausur', 'AG'],
      },
    });
  });

  it('meldet fehlende Seiten einzeln', () => {
    expect(checkCard({ ...qa, front: ' ', back: '' })).toEqual({
      ok: false,
      errors: { front: 'Die Vorderseite fehlt.', back: 'Die Rückseite fehlt.' },
    });
    expect(checkCard({ ...qa, back: '' })).toEqual({
      ok: false,
      errors: { back: 'Die Rückseite fehlt.' },
    });
  });

  it('prüft Lückentexte auf Text und Lücke', () => {
    expect(checkCard(cloze)).toMatchObject({
      ok: true,
      fields: { content: { type: 'cloze', text: 'A {{c1::b}} {{c2::c}}' } },
    });
    expect(checkCard({ ...cloze, text: '  ' })).toEqual({
      ok: false,
      errors: { text: 'Der Text fehlt.' },
    });
    expect(checkCard({ ...cloze, text: 'ohne Lücke' })).toEqual({
      ok: false,
      errors: { text: 'Markiere mindestens ein Wort als Lücke.' },
    });
  });
});

describe('Abfragen einer Karte', () => {
  it('eine Frage hat eine, ein Lückentext eine je Nummer', () => {
    expect(reviewSubs({ type: 'qa', front: 'a', back: 'b' })).toEqual(['']);
    expect(reviewSubs({ type: 'cloze', text: '{{c3::a}} {{c1::b}} {{c1::c}} {{c2::d}}' })).toEqual([
      'c1',
      'c2',
      'c3',
    ]);
  });

  it('haben feste Kennungen', () => {
    expect(reviewItemId('k1', '')).toBe('k1');
    expect(reviewItemId('k1', 'c2')).toBe('k1:c2');
  });
});

describe('Karte und Formular', () => {
  const base = { id: 'k1', deckId: 'd1', norm: '§ 1', tags: ['A'], createdAt: 1, updatedAt: 2 };
  const qaCard: Card = { ...base, type: 'qa', front: 'F', back: 'B' };
  const clozeCard: Card = { ...base, type: 'cloze', text: 'x {{c1::y}}' };

  it('liest Inhalt und Titel', () => {
    expect(contentOf(qaCard)).toEqual({ type: 'qa', front: 'F', back: 'B' });
    expect(contentOf(clozeCard)).toEqual({ type: 'cloze', text: 'x {{c1::y}}' });
    expect(cardTitle({ type: 'qa', front: 'Zeile 1\n  Zeile 2' })).toBe('Zeile 1 Zeile 2');
    expect(cardTitle(clozeCard)).toBe('x y');
    expect(cardTitle({ type: 'qa' })).toBe('');
    expect(cardTitle({ type: 'cloze' })).toBe('');
  });

  it('füllt das Formular aus der Karte', () => {
    expect(formFromCard(qaCard)).toEqual({
      type: 'qa',
      front: 'F',
      back: 'B',
      text: '',
      norm: '§ 1',
      tags: '#A',
    });
    expect(formFromCard(clozeCard)).toEqual({
      type: 'cloze',
      front: '',
      back: '',
      text: 'x {{c1::y}}',
      norm: '§ 1',
      tags: '#A',
    });
  });
});
