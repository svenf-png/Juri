import { describe, expect, it } from 'vitest';
import type { Area, Card, Deck } from '../model/records';
import {
  areaDeckCounts,
  deckLabel,
  deckModel,
  deckProgress,
  libraryModel,
  progressBar,
} from './library';

const area = (id: string, code: string, name: string, createdAt = 1): Area => ({
  id,
  code,
  name,
  createdAt,
  updatedAt: createdAt,
});
const deck = (id: string, name: string, areaIds: string[], norm = ''): Deck => ({
  id,
  name,
  norm,
  areaIds,
  createdAt: 1,
  updatedAt: 1,
});
const card = (id: string, deckId: string, front: string, createdAt = 1): Card => ({
  id,
  deckId,
  type: 'qa',
  front,
  back: 'B',
  norm: '§ 1',
  tags: [],
  createdAt,
  updatedAt: createdAt,
});

const areas = [
  area('oer', 'ÖR', 'Öffentliches Recht', 3),
  area('zr', 'ZR', 'Zivilrecht', 5),
  area('sr', 'SR', 'Strafrecht', 4),
];
const decks = [
  deck('amt', 'Amtshaftung', ['zr', 'oer']),
  deck('delikt', 'Deliktsrecht', ['zr']),
  deck('betrug', 'Diebstahl & Betrug', ['sr']),
];
const input = { areas, decks, cardCounts: { amt: 21, delikt: 1 }, dueCounts: { amt: 2 } };

describe('libraryModel', () => {
  it('gruppiert nach Rechtsgebiet in fester Reihenfolge, Stapel nach Name', () => {
    const model = libraryModel(input);
    expect(model.filters).toEqual([
      { id: 'ALL', label: 'Alle' },
      { id: 'zr', label: 'ZR' },
      { id: 'sr', label: 'SR' },
      { id: 'oer', label: 'ÖR' },
    ]);
    expect(model.groups.map((g) => [g.code, g.stacks.map((s) => s.name)])).toEqual([
      ['ZR', ['Amtshaftung', 'Deliktsrecht']],
      ['SR', ['Diebstahl & Betrug']],
      ['ÖR', ['Amtshaftung']],
    ]);
    expect(model.empty).toBe(false);
    expect(model.filterEmpty).toBe(false);
  });

  it('nennt Karten, weitere Rechtsgebiete und fällige Abfragen', () => {
    const [zr, , oer] = libraryModel(input).groups;
    expect(zr?.stacks[0]).toEqual({
      id: 'amt',
      name: 'Amtshaftung',
      meta: '21 Karten',
      also: 'auch ÖR',
      due: 2,
    });
    expect(zr?.stacks[1]).toMatchObject({ meta: '1 Karte', also: null, due: 0 });
    expect(oer?.stacks[0]?.also).toBe('auch ZR');
  });

  it('filtert nach Rechtsgebiet und fällt bei unbekanntem Filter auf „Alle“ zurück', () => {
    expect(libraryModel(input, 'sr').groups.map((g) => g.code)).toEqual(['SR']);
    expect(libraryModel(input, 'gibt-es-nicht').filter).toBe('ALL');
  });

  it('kennt leere Bibliothek und leeres Rechtsgebiet', () => {
    expect(libraryModel({ ...input, decks: [] }).empty).toBe(true);
    const onlyZr = { ...input, decks: decks.filter((d) => d.id === 'delikt') };
    const model = libraryModel(onlyZr, 'sr');
    expect(model.groups).toEqual([]);
    expect(model.filterEmpty).toBe(true);
    expect(model.empty).toBe(false);
  });

  it('zählt Stapel je Rechtsgebiet', () => {
    expect(areaDeckCounts(areas, decks)).toEqual([
      { id: 'zr', code: 'ZR', name: 'Zivilrecht', meta: '2 Stapel' },
      { id: 'sr', code: 'SR', name: 'Strafrecht', meta: '1 Stapel' },
      { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht', meta: '1 Stapel' },
    ]);
  });
});

describe('Fortschritt', () => {
  it('ist bis M4 ganz „neu“', () => {
    expect(deckProgress(4)).toEqual({ secure: 0, learning: 0, fresh: 4 });
    expect(progressBar(deckProgress(4)).map((p) => [p.key, p.label, p.pct])).toEqual([
      ['secure', '0 sicher', 0],
      ['learning', '0 im Lernen', 0],
      ['fresh', '4 neu', 100],
    ]);
  });

  it('teilt anteilig auf und hat ohne Abfragen keine Leiste', () => {
    const parts = progressBar({ secure: 10, learning: 7, fresh: 4 });
    expect(parts.map((p) => Math.round(p.pct))).toEqual([48, 33, 19]);
    expect(parts.map((p) => p.label)).toEqual(['10 sicher', '7 im Lernen', '4 neu']);
    expect(progressBar(deckProgress(0))).toEqual([]);
  });
});

describe('deckModel', () => {
  const amt = decks[0]!;
  const base = {
    deck: amt,
    areas,
    cards: [card('k2', 'amt', 'Zweite', 2), card('k1', 'amt', 'Erste', 1)],
    itemCount: 2,
    due: 2,
  };

  it('zeigt Rechtsgebiete als Schalter, das letzte ist gesperrt', () => {
    const model = deckModel(base);
    expect(model.areas.map((a) => [a.name, a.on, a.locked])).toEqual([
      ['Zivilrecht', true, false],
      ['Strafrecht', false, false],
      ['Öffentliches Recht', true, false],
    ]);
    const single = deckModel({ ...base, deck: decks[1]! });
    expect(single.areas.filter((a) => a.locked).map((a) => a.name)).toEqual(['Zivilrecht']);
  });

  it('listet Karten in Reihenfolge des Anlegens mit Typ und Titel', () => {
    const model = deckModel(base);
    expect(model.cards.map((c) => [c.id, c.type, c.title, c.norm])).toEqual([
      ['k1', 'Frage', 'Erste', '§ 1'],
      ['k2', 'Frage', 'Zweite', '§ 1'],
    ]);
    expect(model.cardCount).toBe('2 Karten');
  });

  it('wählt den Hauptknopf nach Lage', () => {
    expect(deckModel(base).cta).toEqual({
      kind: 'learn',
      label: '2 fällige Karten lernen',
      short: '2 fällige lernen',
    });
    expect(deckModel({ ...base, due: 1 }).cta.label).toBe('1 fällige Karte lernen');
    expect(deckModel({ ...base, due: 0 }).cta.kind).toBe('idle');
    expect(deckModel({ ...base, cards: [], itemCount: 0, due: 0 }).cta).toMatchObject({
      kind: 'create',
      label: 'Erste Karte anlegen',
    });
  });
});

describe('deckLabel', () => {
  it('nennt Stapel und Kürzel der Rechtsgebiete in fester Reihenfolge', () => {
    expect(deckLabel(decks[0]!, areas)).toBe('Amtshaftung · ZR, ÖR');
    expect(deckLabel(decks[2]!, areas)).toBe('Diebstahl & Betrug · SR');
    expect(deckLabel(decks[0]!, [])).toBe('Amtshaftung');
  });
});
