import { describe, expect, it } from 'vitest';
import type { Card } from '../model/records';
import { askedNumbers, clozePieces, endSummary, faceOf, schemaRows, type Piece } from './present';

const base = { id: 'k', deckId: 'd', norm: '', tags: [], createdAt: 1, updatedAt: 1 };
const qa: Card = { ...base, type: 'qa', front: 'F?', back: 'A.' };
const text =
  'Der Betrug verlangt {{c1::Täuschung}}, {{c2::Irrtum}}, {{c3::Verfügung}} und {{c4::Schaden}}.';
const cloze: Card = { ...base, type: 'cloze', text };

const looks = (pieces: readonly Piece[]) =>
  pieces.flatMap((p) => (p.kind === 'gap' ? [`${p.text}:${p.look}`] : []));

describe('askedNumbers', () => {
  it('nennt die Lückennummern aufsteigend; die ganze Karte hat keine', () => {
    expect(askedNumbers(['c3', 'c1', 'c10'])).toEqual([1, 3, 10]);
    expect(askedNumbers([''])).toEqual([]);
  });
});

describe('clozePieces', () => {
  it('verdeckt gefragte Lücken und zeigt die übrigen', () => {
    expect(looks(clozePieces(text, [2], 0, false))).toEqual([
      'Täuschung:shown',
      'Irrtum:hidden',
      'Verfügung:shown',
      'Schaden:shown',
    ]);
  });

  it('deckt der Reihe nach auf; die zuletzt aufgedeckte trägt den Ring', () => {
    expect(looks(clozePieces(text, [1, 2, 3, 4], 2, true))).toEqual([
      'Täuschung:shown',
      'Irrtum:current',
      'Verfügung:hidden',
      'Schaden:hidden',
    ]);
    expect(looks(clozePieces(text, [1, 2, 3, 4], 4, false))).toEqual([
      'Täuschung:shown',
      'Irrtum:shown',
      'Verfügung:shown',
      'Schaden:shown',
    ]);
  });

  it('behält den Text zwischen den Lücken', () => {
    const pieces = clozePieces('a {{c1::b}} c', [1], 0, false);
    expect(pieces.map((p) => p.text)).toEqual(['a ', 'b', ' c']);
  });
});

describe('faceOf', () => {
  it('Frage: Vorderseite und Antwort', () => {
    expect(faceOf(qa, [''], 0)).toEqual({
      kind: 'qa',
      typeLabel: 'Frage',
      question: 'F?',
      answer: 'A.',
    });
  });

  it('einzelne Lücke: vorn verdeckt, hinten aufgedeckt', () => {
    const face = faceOf(cloze, ['c2'], 0);
    expect(face.kind).toBe('cloze');
    if (face.kind !== 'cloze') return;
    expect(face.typeLabel).toBe('Lücke');
    expect(looks(face.front)).toEqual([
      'Täuschung:shown',
      'Irrtum:hidden',
      'Verfügung:shown',
      'Schaden:shown',
    ]);
    expect(looks(face.back).every((l) => l.endsWith(':shown'))).toBe(true);
  });

  it('gebündelte Lücken: „Lücke 3 von 4“ mit Ring auf der dritten', () => {
    const face = faceOf(cloze, ['c1', 'c2', 'c3', 'c4'], 3);
    expect(face).toMatchObject({
      kind: 'bundle',
      typeLabel: 'Lücke 3 von 4',
      revealed: 3,
      total: 4,
    });
    if (face.kind !== 'bundle') return;
    expect(looks(face.pieces)).toEqual([
      'Täuschung:shown',
      'Irrtum:shown',
      'Verfügung:current',
      'Schaden:hidden',
    ]);
  });

  it('Bündel ohne Aufdeckung beginnt bei „Lücke 1“; ganz aufgedeckt ohne Ring', () => {
    expect(faceOf(cloze, ['c1', 'c2'], 0)).toMatchObject({
      typeLabel: 'Lücke 1 von 2',
      revealed: 0,
    });
    const done = faceOf(cloze, ['c1', 'c2'], 5);
    expect(done).toMatchObject({ revealed: 2 });
    if (done.kind === 'bundle')
      expect(looks(done.pieces).some((l) => l.endsWith('current'))).toBe(false);
  });
});

describe('Schema in der Lernansicht', () => {
  const points = [
    {
      id: 'p1',
      level: 1,
      text: 'Rechtsweg',
      norm: '§ 40 I VwGO',
      content: 'Öffentlich-rechtlich.',
    },
    { id: 'p2', level: 1, text: 'Klagebefugnis', link: 'k2' },
    { id: 'p3', level: 2, text: 'Möglichkeitstheorie' },
    { id: 'p4', level: 1, text: 'Frist' },
  ];
  const schema: Card = { ...base, type: 'schema', title: 'Anfechtungsklage', points };

  it('zeigt Titel und Zählung; nichts ist aufgedeckt, solange nichts aufgedeckt ist', () => {
    const face = faceOf(schema, [''], 0);
    expect(face).toMatchObject({
      kind: 'schema',
      typeLabel: 'Schema',
      title: 'Anfechtungsklage',
      revealed: 0,
      total: 4,
    });
    if (face.kind !== 'schema') return;
    expect(face.rows.map((r) => r.number)).toEqual(['1', '2', 'a', '3']);
    expect(
      face.rows.every((r) => !r.shown && r.text === '' && r.content === '' && r.link === null),
    ).toBe(true);
  });

  it('deckt Punkt für Punkt auf, der letzte aufgedeckte ist hervorgehoben, verdeckte tragen keinen Text', () => {
    const face = faceOf(schema, [''], 2);
    if (face.kind !== 'schema') throw new Error('kein Schema');
    expect(face.rows.map((r) => [r.shown, r.current])).toEqual([
      [true, false],
      [true, true],
      [false, false],
      [false, false],
    ]);
    expect(face.rows[0]).toMatchObject({
      text: 'Rechtsweg',
      norm: '§ 40 I VwGO',
      content: 'Öffentlich-rechtlich.',
      link: null,
    });
    expect(face.rows[1]).toMatchObject({ link: 'k2' });
    expect(face.rows[2]).toMatchObject({ text: '', link: null });
  });

  it('ganz aufgedeckt gibt es keine Hervorhebung; zu große Zähler werden begrenzt', () => {
    const face = faceOf(schema, [''], 99);
    if (face.kind !== 'schema') throw new Error('kein Schema');
    expect(face.revealed).toBe(4);
    expect(face.rows.every((r) => r.shown && !r.current)).toBe(true);
    expect(schemaRows(points, 0)).toHaveLength(4);
  });
});

describe('endSummary', () => {
  const end = { reviews: 24, again: 3, stillDue: 0, next: 'morgen' };

  it('nennt Wiederholungen, Nochmal und den nächsten Termin', () => {
    expect(endSummary(end)).toBe(
      '24 Wiederholungen, davon 3 nochmal gelernt. Nächste Runde: morgen.',
    );
    expect(endSummary({ ...end, reviews: 1, again: 0 })).toBe(
      '1 Wiederholung, davon 0 nochmal gelernt. Nächste Runde: morgen.',
    );
  });

  it('weist auf Karten hin, die heute noch einmal kommen; ohne Termin bleibt der Satz weg', () => {
    expect(endSummary({ ...end, stillDue: 2 })).toBe(
      '24 Wiederholungen, davon 3 nochmal gelernt. 2 Karten kommen heute noch einmal.',
    );
    expect(endSummary({ ...end, stillDue: 1 })).toContain('1 Karte kommt heute noch einmal');
    expect(endSummary({ ...end, next: null })).toBe('24 Wiederholungen, davon 3 nochmal gelernt.');
  });
});
