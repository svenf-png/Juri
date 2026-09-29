import { describe, expect, it } from 'vitest';
import type { Card } from '../model/records';
import {
  CARD_TYPE_LABEL,
  cardPreview,
  cardTitle,
  buildCard,
  buildItems,
  checkCard,
  contentOf,
  formatTags,
  normalizeTags,
  mediaIdsOf,
  reviewItemId,
  reviewSubs,
  sourceChip,
  sourceCoverChip,
  sourceLabel,
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
  note: '',
};
const cloze: CardForm = {
  type: 'cloze',
  front: '',
  back: '',
  text: 'A {{c1::b}} {{c2::c}}',
  norm: '',
  tags: '',
  note: '',
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
        note: '',
      },
    });
  });

  it('bereinigt die Notiz und prüft ihre Länge', () => {
    expect(checkCard({ ...qa, note: '  Merke: Alt.\nNeu.  ' })).toMatchObject({
      ok: true,
      fields: { note: 'Merke: Alt.\nNeu.' },
    });
    expect(checkCard({ ...qa, note: 'x'.repeat(2001) })).toEqual({
      ok: false,
      errors: { note: 'Die Notiz ist zu lang (höchstens 2.000 Zeichen).' },
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
});

describe('Grenzen', () => {
  it('meldet zu lange Felder, statt sie zu kürzen', () => {
    expect(checkCard({ ...qa, front: 'a'.repeat(2001) })).toEqual({
      ok: false,
      errors: { front: 'Die Vorderseite ist zu lang (höchstens 2.000 Zeichen).' },
    });
    expect(checkCard({ ...qa, back: 'a'.repeat(4001) })).toEqual({
      ok: false,
      errors: { back: 'Die Rückseite ist zu lang (höchstens 4.000 Zeichen).' },
    });
    expect(checkCard({ ...cloze, text: `{{c1::a}}${'a'.repeat(4000)}` })).toEqual({
      ok: false,
      errors: { text: 'Der Text mit den Lücken ist zu lang (höchstens 4.000 Zeichen).' },
    });
    expect(checkCard({ ...qa, front: 'a'.repeat(2000), back: 'b'.repeat(4000) }).ok).toBe(true);
  });

  it('meldet eine zu lange Norm und prüft alle Felder zugleich', () => {
    expect(checkCard({ ...qa, norm: 'n'.repeat(201) })).toEqual({
      ok: false,
      errors: { norm: 'Die Norm ist zu lang (höchstens 200 Zeichen).' },
    });
    expect(checkCard({ ...qa, front: '', norm: 'n'.repeat(201) })).toMatchObject({
      ok: false,
      errors: { front: 'Die Vorderseite fehlt.', norm: expect.any(String) as string },
    });
    expect(checkCard({ ...cloze, text: 'ohne Lücke', norm: 'n'.repeat(201) })).toMatchObject({
      ok: false,
      errors: {
        text: 'Markiere mindestens ein Wort als Lücke.',
        norm: expect.any(String) as string,
      },
    });
  });
});

describe('buildCard und buildItems', () => {
  it('bauen Karte und Abfragen aus den Feldern', () => {
    const fields = {
      content: { type: 'cloze' as const, text: '{{c1::a}} {{c2::b}}' },
      norm: '§ 1',
      tags: ['A'],
      note: '',
    };
    const card = buildCard('k1', 'd1', fields, 5, 6);
    expect(card).toEqual({
      id: 'k1',
      deckId: 'd1',
      norm: '§ 1',
      tags: ['A'],
      createdAt: 5,
      updatedAt: 6,
      type: 'cloze',
      text: '{{c1::a}} {{c2::b}}',
    });
    expect(buildItems(card, 7)).toEqual([
      { id: 'k1:c1', cardId: 'k1', deckId: 'd1', sub: 'c1', createdAt: 7 },
      { id: 'k1:c2', cardId: 'k1', deckId: 'd1', sub: 'c2', createdAt: 7 },
    ]);
    const qaCard = buildCard(
      'k2',
      'd1',
      { content: { type: 'qa', front: 'F', back: 'B' }, norm: '', tags: [], note: '' },
      1,
      1,
    );
    expect(qaCard).toMatchObject({ type: 'qa', front: 'F', back: 'B' });
    expect('note' in qaCard).toBe(false);
    const noted = buildCard(
      'k3',
      'd1',
      { content: { type: 'qa', front: 'F', back: 'B' }, norm: '', tags: [], note: 'N' },
      1,
      1,
    );
    expect(noted).toMatchObject({ note: 'N' });
    expect(buildItems(qaCard, 1)).toEqual([
      { id: 'k2', cardId: 'k2', deckId: 'd1', sub: '', createdAt: 1 },
    ]);
  });
});

describe('Schema-Karten', () => {
  const schemaForm: CardForm = {
    type: 'schema',
    front: '',
    back: '',
    text: '',
    title: ' Amtshaftung ',
    points: [
      { id: 'p1', level: 1, text: 'Amt', norm: '', content: '', link: null },
      { id: 'p2', level: 2, text: 'Pflicht', norm: '§ 839 BGB', content: '', link: 'k9' },
    ],
    norm: '§ 839 BGB',
    tags: '',
    note: 'Merke',
  };

  it('checkCard prüft Titel und Punkte und liefert die Felder', () => {
    const out = checkCard(schemaForm);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.fields.content).toEqual({
      type: 'schema',
      title: 'Amtshaftung',
      points: [
        { id: 'p1', level: 1, text: 'Amt' },
        { id: 'p2', level: 2, text: 'Pflicht', norm: '§ 839 BGB', link: 'k9' },
      ],
    });
    expect(out.fields.note).toBe('Merke');
  });

  it('meldet Fehler des Schemas unter „schema“, ohne Titel und Punkte', () => {
    const out = checkCard({ ...schemaForm, title: '', points: [] });
    expect(out).toMatchObject({
      ok: false,
      errors: {
        schema: { title: 'Der Titel fehlt.', points: 'Ein Schema braucht mindestens einen Punkt.' },
      },
    });
    expect(checkCard({ ...schemaForm, title: '' }).ok).toBe(false);
  });

  it('meldet auch zu lange Norm und Notiz neben dem Schema', () => {
    const out = checkCard({ ...schemaForm, norm: 'x'.repeat(201) });
    expect(out).toMatchObject({
      ok: false,
      errors: { norm: 'Die Norm ist zu lang (höchstens 200 Zeichen).' },
    });
  });

  it('eine Schema-Karte hat genau eine Abfrage; Titel dient als Überschrift und Etikett', () => {
    const out = checkCard(schemaForm);
    if (!out.ok) throw new Error('ungültig');
    const card = buildCard('s1', 'd1', out.fields, 5, 5);
    expect(card).toMatchObject({ type: 'schema', title: 'Amtshaftung', note: 'Merke' });
    expect(reviewSubs(contentOf(card))).toEqual(['']);
    expect(buildItems(card, 5)).toEqual([
      { id: 's1', cardId: 's1', deckId: 'd1', sub: '', createdAt: 5 },
    ]);
    expect(cardTitle(card)).toBe('Amtshaftung');
    expect(CARD_TYPE_LABEL.schema).toBe('Schema');
    expect(contentOf(card)).toEqual(out.fields.content);
  });
});

describe('cardPreview', () => {
  const base = { id: 'k', deckId: 'd', norm: '', tags: [], createdAt: 1, updatedAt: 1 };
  it('zeigt die Antwort, den aufgedeckten Text oder die Hauptpunkte eines Schemas', () => {
    expect(cardPreview({ ...base, type: 'qa', front: 'F', back: ' Antwort. ' })).toBe('Antwort.');
    expect(cardPreview({ ...base, type: 'cloze', text: 'Ein {{c1::Wort}} fehlt' })).toBe(
      'Ein Wort fehlt',
    );
    expect(
      cardPreview({
        ...base,
        type: 'schema',
        title: 'T',
        points: [
          { id: 'p1', level: 1, text: 'Weg' },
          { id: 'p2', level: 2, text: 'Unter' },
          { id: 'p3', level: 1, text: 'Frist' },
        ],
      }),
    ).toBe('1. Weg · 2. Frist');
  });
});

describe('Abdeckung (M6)', () => {
  const masks = [
    { n: 3, x: 0.5, y: 0.5, w: 0.2, h: 0.1 },
    { n: 1, x: 0.1, y: 0.1, w: 0.3, h: 0.1 },
  ];
  const cover: CardForm = {
    type: 'cover',
    front: '',
    back: '',
    text: '',
    mediaId: 'img1',
    masks,
    source: { name: 'Skript Sachenrecht.pdf', page: 14 },
    norm: '',
    tags: '',
    note: '',
  };

  it('prüft Bild und Felder', () => {
    expect(checkCard({ ...cover, mediaId: undefined })).toMatchObject({
      ok: false,
      errors: { cover: expect.stringContaining('Bild') as string },
    });
    expect(checkCard({ ...cover, masks: [] })).toMatchObject({
      ok: false,
      errors: { cover: expect.stringContaining('Feld') as string },
    });
  });

  it('ordnet die Felder nach Nummer und behält die Herkunft', () => {
    const checked = checkCard(cover);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.fields.content).toMatchObject({ type: 'cover', mediaId: 'img1' });
    expect(checked.fields.source).toEqual({ name: 'Skript Sachenrecht.pdf', page: 14 });
    const card = buildCard('k1', 'd1', checked.fields, 5, 6);
    expect(card).toMatchObject({ type: 'cover', mediaId: 'img1', source: { page: 14 } });
    expect(card.type === 'cover' && card.masks.map((m) => m.n)).toEqual([1, 3]);
  });

  it('macht aus jedem Feld eine Abfrage mit fester Kennung', () => {
    const card = buildCard(
      'k1',
      'd1',
      {
        content: { type: 'cover', mediaId: 'img1', masks: masks.slice().reverse() },
        norm: '',
        tags: [],
        note: '',
      },
      1,
      1,
    );
    expect(reviewSubs(contentOf(card))).toEqual(['m1', 'm3']);
    expect(buildItems(card, 9).map((i) => i.id)).toEqual(['k1:m1', 'k1:m3']);
    expect(CARD_TYPE_LABEL.cover).toBe('Abdeckung');
  });

  it('nennt Titel und Vorschau aus Herkunft oder Zahl der Felder', () => {
    const base = { id: 'k', deckId: 'd', norm: '', tags: [], createdAt: 1, updatedAt: 1 };
    const withSource: Card = {
      ...base,
      type: 'cover',
      mediaId: 'i',
      masks,
      source: { name: 'A.pdf', page: 2 },
    };
    const without: Card = { ...base, type: 'cover', mediaId: 'i', masks };
    expect(cardTitle(withSource)).toBe('A.pdf, S. 2');
    expect(cardTitle(without)).toBe('Bild mit 2 Feldern');
    expect(cardPreview(without)).toBe('Bild mit 2 Feldern');
    expect(cardTitle({ ...withSource, source: { name: 'B.pdf' } })).toBe('B.pdf');
    expect(cardTitle({ ...without, masks: masks.slice(0, 1) })).toBe('Bild mit 1 Feld');
    expect(cardTitle({ type: 'cover' })).toBe('Bild ohne Felder');
  });

  it('nennt die Medien einer Karte ohne Doppelte', () => {
    expect(
      mediaIdsOf({ type: 'cover', mediaId: 'i', source: { name: 'x', mediaId: 'p' } }),
    ).toEqual(['i', 'p']);
    expect(mediaIdsOf({ type: 'qa', source: { name: 'x', mediaId: 'p' } })).toEqual(['p']);
    expect(mediaIdsOf({ type: 'qa' })).toEqual([]);
  });

  it('gibt Herkunft an Frage, Lücke und Schema weiter', () => {
    const source = { name: 'A.pdf', page: 3, mediaId: 'p' };
    const q = checkCard({ ...qa, source });
    expect(q.ok && buildCard('k', 'd', q.fields, 1, 1)).toMatchObject({ type: 'qa', source });
    const c = checkCard({ ...cloze, source });
    expect(c.ok && buildCard('k', 'd', c.fields, 1, 1)).toMatchObject({ type: 'cloze', source });
  });

  it('kürzt die Herkunft für Chips', () => {
    expect(sourceChip({ name: 'Skript.pdf', page: 14 })).toBe('PDF S. 14');
    expect(sourceChip({ name: 'Skript.pdf' })).toBe('Skript.pdf');
    expect(sourceLabel({ name: 'Skript.pdf', page: 14 })).toBe('Skript.pdf, S. 14');
    expect(sourceCoverChip({ name: 'Skript Sachenrecht.pdf', page: 14 })).toBe(
      'PDF · Skript Sachenrecht S. 14',
    );
    expect(sourceCoverChip({ name: 'Buch' })).toBe('PDF · Buch');
  });
});
