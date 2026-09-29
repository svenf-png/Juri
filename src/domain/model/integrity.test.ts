import { describe, expect, it } from 'vitest';
import { hasIntegrity } from './integrity';

const area = { id: 'a1', code: 'ÖR', name: 'Öffentliches Recht', createdAt: 1, updatedAt: 1 };
const deck = { id: 'd1', name: 'Stapel', norm: '', areaIds: ['a1'], createdAt: 1, updatedAt: 1 };
const base = { deckId: 'd1', norm: '', tags: [], createdAt: 1, updatedAt: 1 };
const qa = { ...base, id: 'q1', type: 'qa', front: 'F', back: 'B' };
const schema = (link?: string) => ({
  ...base,
  id: 's1',
  type: 'schema',
  title: 'T',
  points: [{ id: 'p1', level: 1, text: 'Punkt', ...(link === undefined ? {} : { link }) }],
});
const item = (id: string) => ({ id, cardId: id, deckId: 'd1', sub: '', createdAt: 1 });
const tables = (cards: Record<string, unknown>[]) => ({
  areas: [area],
  decks: [deck],
  cards,
  reviewItems: cards.map((c) => item(c.id as string)),
});

describe('hasIntegrity (Verknüpfungen, ADR-009)', () => {
  it('akzeptiert Schemas mit und ohne Verknüpfung auf eine vorhandene Karte', () => {
    expect(hasIntegrity(tables([qa, schema()]))).toBe(true);
    expect(hasIntegrity(tables([qa, schema('q1')]))).toBe(true);
  });

  it('lehnt Verknüpfungen ins Leere und auf sich selbst ab', () => {
    expect(hasIntegrity(tables([schema('fehlt')]))).toBe(false);
    expect(hasIntegrity(tables([qa, schema('s1')]))).toBe(false);
  });

  it('eine Schema-Karte hat genau eine Abfrage', () => {
    const t = tables([schema()]);
    expect(hasIntegrity({ ...t, reviewItems: [] })).toBe(false);
    expect(hasIntegrity({ ...t, reviewItems: [item('s1'), { ...item('s1'), id: 's1:c1' }] })).toBe(
      false,
    );
  });

  it('lehnt ungültige Karten und fehlende Verweise ab', () => {
    expect(hasIntegrity(tables([{ ...qa, deckId: 'x' }]))).toBe(false);
    expect(hasIntegrity(tables([{ ...schema(), points: [] }]))).toBe(false);
    expect(hasIntegrity({ ...tables([]), decks: [{ ...deck, areaIds: ['x'] }] })).toBe(false);
  });
});

describe('hasIntegrity (Medien, M6)', () => {
  const img = { id: 'i1', kind: 'image', mime: 'image/jpeg', name: 'a.jpg', size: 3, createdAt: 1 };
  const pdf = {
    id: 'p1',
    kind: 'pdf',
    mime: 'application/pdf',
    name: 'a.pdf',
    size: 3,
    createdAt: 1,
  };
  const cover = (extra: Record<string, unknown> = {}) => ({
    ...base,
    id: 'c1',
    type: 'cover',
    mediaId: 'i1',
    masks: [{ n: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
    ...extra,
  });
  const withMedia = (cards: Record<string, unknown>[], media: Record<string, unknown>[]) => ({
    ...tables(cards),
    media,
    reviewItems: cards.flatMap((c) =>
      c.type === 'cover'
        ? [{ id: `${String(c.id)}:m1`, cardId: c.id, deckId: 'd1', sub: 'm1', createdAt: 1 }]
        : [item(c.id as string)],
    ),
  });

  it('verlangt das Bild einer Abdeckung im Backup', () => {
    expect(hasIntegrity(withMedia([cover()], [img]))).toBe(true);
    expect(hasIntegrity(withMedia([cover()], []))).toBe(false);
  });

  it('verlangt ein Bild für die Abdeckung und ein PDF für die Herkunft', () => {
    expect(hasIntegrity(withMedia([cover({ mediaId: 'p1' })], [pdf]))).toBe(false);
    expect(
      hasIntegrity(withMedia([{ ...qa, source: { name: 'a.pdf', mediaId: 'p1' } }], [pdf])),
    ).toBe(true);
    expect(
      hasIntegrity(withMedia([{ ...qa, source: { name: 'a.pdf', mediaId: 'p1' } }], [img])),
    ).toBe(false);
    expect(hasIntegrity(withMedia([{ ...qa, source: { name: 'a.pdf', mediaId: 'p1' } }], []))).toBe(
      false,
    );
  });

  it('erwartet je Feld eine Abfrage', () => {
    const t = withMedia([cover()], [img]);
    expect(hasIntegrity({ ...t, reviewItems: [] })).toBe(false);
  });
});
