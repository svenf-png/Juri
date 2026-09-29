import { describe, expect, it } from 'vitest';
import type { Card, SchemaPoint } from '../model/records';
import { cardSchema } from '../model/records';
import {
  addPoint,
  canIndent,
  canMove,
  canOutdent,
  checkSchema,
  describeLinkUse,
  emptyPoint,
  fixLevels,
  indentPoint,
  linkedCardIds,
  linksTo,
  linkTotals,
  movePoint,
  newPointId,
  outdentPoint,
  pointLabels,
  pointNumbers,
  pointPaths,
  pointsToDraft,
  removePoint,
  subtreeEnd,
  updatePoint,
  withoutLinks,
  type DraftPoint,
} from './schema';

const p = (id: number, level: number, text = `P${String(id)}`): DraftPoint => ({
  ...emptyPoint(`p${String(id)}`, level),
  text,
});
const levels = (points: readonly { level: number }[]) => points.map((x) => x.level);
const texts = (points: readonly DraftPoint[]) => points.map((x) => x.text);

/** 1. / a) / b) / 2. / a) / aa) */
const tree = [p(1, 1), p(2, 2), p(3, 2), p(4, 1), p(5, 2), p(6, 3)];

describe('Teilbaum und Ebenen', () => {
  it('subtreeEnd reicht bis zum nächsten Punkt auf gleicher oder höherer Ebene', () => {
    expect(subtreeEnd(tree, 0)).toBe(3);
    expect(subtreeEnd(tree, 1)).toBe(2);
    expect(subtreeEnd(tree, 3)).toBe(6);
    expect(subtreeEnd(tree, 5)).toBe(6);
  });

  it('fixLevels: erster Punkt auf Ebene 1, sonst höchstens eine Ebene tiefer, höchstens Ebene 3', () => {
    expect(levels(fixLevels([p(1, 3), p(2, 3), p(3, 1)]))).toEqual([1, 2, 1]);
    expect(levels(fixLevels([p(1, 1), p(2, 2), p(3, 3), p(4, 3)]))).toEqual([1, 2, 3, 3]);
    expect(levels(fixLevels([p(1, 0), p(2, 9)]))).toEqual([1, 2]);
  });
});

describe('Punkte hinzufügen, ändern, entfernen', () => {
  it('newPointId nimmt größte Nummer plus eins', () => {
    expect(newPointId([])).toBe('p1');
    expect(newPointId([{ id: 'p3' }, { id: 'p1' }])).toBe('p4');
  });

  it('addPoint setzt hinter den Teilbaum des gewählten Punkts, gleiche Ebene', () => {
    const out = addPoint(tree, 0);
    expect(out.index).toBe(3);
    expect(out.points[3]).toMatchObject({ id: 'p7', level: 1, text: '' });
    expect(out.points).toHaveLength(7);
  });

  it('addPoint ohne Auswahl hängt an, in leerer Liste auf Ebene 1', () => {
    expect(addPoint([], null)).toMatchObject({ index: 0, points: [{ id: 'p1', level: 1 }] });
    expect(addPoint([p(1, 1), p(2, 2)], null).points[2]).toMatchObject({ level: 2 });
  });

  it('addPoint stoppt bei 60 Punkten', () => {
    const many = Array.from({ length: 60 }, (_, i) => p(i + 1, 1));
    const out = addPoint(many, 3);
    expect(out.points).toHaveLength(60);
    expect(out.index).toBe(3);
  });

  it('updatePoint ändert nur den gewählten Punkt', () => {
    const out = updatePoint(tree, 1, { text: 'neu', link: 'k1' });
    expect(out[1]).toMatchObject({ id: 'p2', text: 'neu', link: 'k1' });
    expect(out[0]).toBe(tree[0]);
  });

  it('removePoint entfernt nur diesen Punkt, Unterpunkte rücken nach', () => {
    expect(levels(removePoint(tree, 3))).toEqual([1, 2, 2, 2, 3]);
    expect(texts(removePoint(tree, 3))).toEqual(['P1', 'P2', 'P3', 'P5', 'P6']);
    // Der erste Punkt fällt weg: Ebenen werden neu geordnet.
    expect(levels(removePoint(tree, 0))).toEqual([1, 2, 1, 2, 3]);
  });
});

describe('Einrücken und Ausrücken', () => {
  it('Einrücken nimmt den Teilbaum mit', () => {
    const out = indentPoint([p(1, 1), p(2, 1), p(3, 2)], 1);
    expect(levels(out)).toEqual([1, 2, 3]);
  });

  it('Einrücken geht nur unter einen Punkt gleicher oder tieferer Ebene', () => {
    expect(canIndent(tree, 0)).toBe(false);
    expect(canIndent(tree, 1)).toBe(false);
    expect(canIndent(tree, 2)).toBe(true);
    expect(canIndent(tree, 3)).toBe(false);
    expect(canIndent([p(1, 1), p(2, 1), p(3, 3)], 1)).toBe(false);
    expect(canIndent([p(1, 1), p(2, 2)], 5)).toBe(false);
    expect(indentPoint(tree, 0)).toEqual(tree);
  });

  it('Einrücken bleibt bei Ebene 3 stehen, auch für Teilbäume', () => {
    const deep = [p(1, 1), p(2, 2), p(3, 3)];
    expect(canIndent(deep, 2)).toBe(false);
    expect(canIndent([p(1, 1), p(2, 1), p(3, 2), p(4, 3)], 1)).toBe(false);
  });

  it('Ausrücken nimmt den Teilbaum mit, nachfolgende Geschwister werden Kinder', () => {
    expect(canOutdent(tree, 0)).toBe(false);
    expect(levels(outdentPoint(tree, 1))).toEqual([1, 1, 2, 1, 2, 3]);
    expect(outdentPoint(tree, 0)).toEqual(tree);
    expect(levels(outdentPoint([p(1, 1), p(2, 2), p(3, 3)], 1))).toEqual([1, 1, 2]);
  });
});

describe('Verschieben', () => {
  it('nach oben: vor das vorherige Geschwister, mit Teilbaum', () => {
    const out = movePoint(tree, 3, -1);
    expect(texts(out.points)).toEqual(['P4', 'P5', 'P6', 'P1', 'P2', 'P3']);
    expect(out.index).toBe(0);
  });

  it('nach unten: hinter das nächste Geschwister, mit Teilbaum', () => {
    const out = movePoint(tree, 0, 1);
    expect(texts(out.points)).toEqual(['P4', 'P5', 'P6', 'P1', 'P2', 'P3']);
    expect(out.index).toBe(3);
    const inner = movePoint(tree, 1, 1);
    expect(texts(inner.points)).toEqual(['P1', 'P3', 'P2', 'P4', 'P5', 'P6']);
    expect(inner.index).toBe(2);
  });

  it('nicht über den Oberpunkt hinaus und nicht am Rand', () => {
    expect(canMove(tree, 0, -1)).toBe(false);
    expect(canMove(tree, 1, -1)).toBe(false);
    expect(canMove(tree, 2, 1)).toBe(false);
    expect(canMove(tree, 3, 1)).toBe(false);
    expect(movePoint(tree, 1, -1)).toEqual({ points: tree, index: 1 });
    expect(movePoint(tree, 3, 1)).toEqual({ points: tree, index: 3 });
  });
});

describe('Zählung', () => {
  it('zählt je Ebene neu unter ihrem Oberpunkt', () => {
    expect(pointNumbers(tree)).toEqual(['1', 'a', 'b', '2', 'a', 'aa']);
    expect(pointLabels(tree)).toEqual(['1.', 'a)', 'b)', '2.', 'a)', 'aa)']);
  });

  it('pointPaths nennt den Weg von der obersten Ebene: 2.b und 2.b.bb', () => {
    expect(pointPaths(tree)).toEqual(['1', '1.a', '1.b', '2', '2.a', '2.a.aa']);
    expect(pointPaths([p(1, 1), p(2, 2), p(3, 3), p(4, 3), p(5, 2)])).toEqual([
      '1',
      '1.a',
      '1.a.aa',
      '1.a.bb',
      '1.b',
    ]);
  });

  it('nach z folgt aa, ab; Ebene 3 verdoppelt', () => {
    const wide = [p(1, 1), ...Array.from({ length: 28 }, (_, i) => p(i + 2, 2))];
    const numbers = pointNumbers(wide);
    expect(numbers[26]).toBe('z');
    expect(numbers[27]).toBe('aa');
    expect(numbers[28]).toBe('ab');
    expect(pointNumbers([p(1, 1), p(2, 2), p(3, 3), p(4, 3)])).toEqual(['1', 'a', 'aa', 'bb']);
  });

  it('Ebene 3 zählt nach einem neuen Ebene-2-Punkt wieder bei aa', () => {
    expect(pointNumbers([p(1, 1), p(2, 2), p(3, 3), p(4, 2), p(5, 3)])).toEqual([
      '1',
      'a',
      'aa',
      'b',
      'aa',
    ]);
  });
});

describe('checkSchema', () => {
  it('trimmt, lässt leere Werte weg und behält Kennungen', () => {
    const out = checkSchema({
      title: '  Amtshaftung  ',
      points: [
        { ...p(1, 1, ' Amt  öffentlich '), norm: ' § 839 BGB ', content: ' Inhalt ', link: 'k1' },
        emptyPoint('p2', 2),
        p(3, 2, 'B'),
      ],
    });
    expect(out).toEqual({
      ok: true,
      fields: {
        title: 'Amtshaftung',
        points: [
          {
            id: 'p1',
            level: 1,
            text: 'Amt öffentlich',
            norm: '§ 839 BGB',
            content: 'Inhalt',
            link: 'k1',
          },
          { id: 'p3', level: 2, text: 'B' },
        ],
      },
    });
  });

  it('meldet fehlenden Titel und fehlende Punkte', () => {
    expect(checkSchema({ title: ' ', points: [emptyPoint('p1')] })).toEqual({
      ok: false,
      errors: { title: 'Der Titel fehlt.', points: 'Ein Schema braucht mindestens einen Punkt.' },
    });
  });

  it('meldet Punkte ohne Text, aber mit Norm, Inhalt oder Verknüpfung', () => {
    const bad = [
      { ...emptyPoint('p1'), norm: '§ 1' },
      { ...emptyPoint('p2'), content: 'x' },
      { ...emptyPoint('p3'), link: 'k' },
    ];
    const out = checkSchema({ title: 'T', points: bad });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(Object.keys(out.errors.point ?? {})).toEqual(['p1', 'p2', 'p3']);
      expect(out.errors.point?.p1).toBe('Der Punkt braucht einen Text.');
    }
  });

  it('prüft Längen', () => {
    const long = (n: number) => 'x'.repeat(n);
    const out = checkSchema({
      title: long(201),
      points: [
        p(1, 1, long(201)),
        { ...p(2, 1), norm: long(201) },
        { ...p(3, 1), content: long(2001) },
      ],
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors.title).toContain('200');
      expect(out.errors.point?.p1).toContain('Der Text');
      expect(out.errors.point?.p2).toContain('Die Norm');
      expect(out.errors.point?.p3).toContain('Der Inhalt');
    }
  });

  it('ordnet Ebenen nach dem Wegfall leerer Punkte neu', () => {
    const out = checkSchema({
      title: 'T',
      points: [emptyPoint('p1'), p(2, 2, 'A'), p(3, 3, 'B')],
    });
    expect(out.ok && levels(out.fields.points)).toEqual([1, 2]);
  });

  it('das Ergebnis besteht das Kartenschema', () => {
    const out = checkSchema({ title: 'T', points: tree });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const card = {
      id: 'k',
      deckId: 'd',
      norm: '',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
      type: 'schema',
      ...out.fields,
    };
    expect(cardSchema.safeParse(card).success).toBe(true);
    expect(cardSchema.safeParse({ ...card, points: [] }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, points: [{ ...tree[0], level: 2 }] }).success).toBe(
      false,
    );
    expect(cardSchema.safeParse({ ...card, points: [tree[0], tree[0]] }).success).toBe(false);
  });
});

describe('pointsToDraft', () => {
  it('macht aus fehlenden Feldern leeren Text und null', () => {
    const points: SchemaPoint[] = [
      { id: 'p1', level: 1, text: 'A' },
      { id: 'p2', level: 2, text: 'B', norm: 'N', content: 'C', link: 'k' },
    ];
    expect(pointsToDraft(points)).toEqual([
      { id: 'p1', level: 1, text: 'A', norm: '', content: '', link: null },
      { id: 'p2', level: 2, text: 'B', norm: 'N', content: 'C', link: 'k' },
    ]);
  });
});

describe('Verknüpfungen', () => {
  const base = { deckId: 'd', norm: '', tags: [], createdAt: 1, updatedAt: 1 };
  const schema = (id: string, links: (string | undefined)[]): Card => ({
    ...base,
    id,
    type: 'schema',
    title: id,
    points: links.map((link, i) => ({
      id: `p${String(i + 1)}`,
      level: 1,
      text: `Punkt ${String(i + 1)}`,
      ...(link === undefined ? {} : { link }),
    })),
  });
  const qa: Card = { ...base, id: 'q', type: 'qa', front: 'F', back: 'B' };

  it('linkedCardIds nennt jede verknüpfte Karte einmal; andere Typen keine', () => {
    expect(linkedCardIds(schema('s', ['a', undefined, 'b', 'a']))).toEqual(['a', 'b']);
    expect(linkedCardIds(qa)).toEqual([]);
  });

  it('linksTo zählt Punkte je Schema und lässt mitgelöschte Karten aus', () => {
    const cards = [schema('s1', ['a', 'a', 'b']), schema('s2', ['b']), schema('s3', []), qa];
    const uses = linksTo(cards, new Set(['a']));
    expect(uses.map((u) => [u.card.id, u.points])).toEqual([['s1', 2]]);
    expect(linkTotals(linksTo(cards, new Set(['a', 'b'])))).toEqual({ links: 4, schemas: 2 });
    expect(linksTo(cards, new Set(['b']), new Set(['s2'])).map((u) => u.card.id)).toEqual(['s1']);
  });

  it('describeLinkUse nennt Schemas und Punkte, Einzahl und Mehrzahl', () => {
    const cards = [schema('s1', ['a', 'a']), schema('s2', ['a'])];
    expect(describeLinkUse(linksTo(cards, new Set(['a'])))).toEqual({
      heading: 'Verknüpft in 2 Schemas',
      rows: [
        ['s1', '2 Punkte'],
        ['s2', '1 Punkt'],
      ],
    });
    expect(describeLinkUse(linksTo(cards.slice(1), new Set(['a']))).heading).toBe(
      'Verknüpft in 1 Schema',
    );
  });

  it('withoutLinks entfernt nur Verweise auf die Ziele, Punkte bleiben', () => {
    const card = schema('s', ['a', 'b']) as Card & { type: 'schema' };
    const out = withoutLinks(card, new Set(['a']));
    expect(out?.points).toEqual([
      { id: 'p1', level: 1, text: 'Punkt 1' },
      { id: 'p2', level: 1, text: 'Punkt 2', link: 'b' },
    ]);
    expect(withoutLinks(card, new Set(['z']))).toBeNull();
    expect(cardSchema.safeParse(out).success).toBe(true);
  });
});
