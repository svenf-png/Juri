import { describe, expect, it } from 'vitest';
import type { Area, Deck } from '../model/records';
import { createdWithin, dueByArea, todayInputFrom } from './build';
import { todayModel } from './today';

const area = (id: string, code: string, name: string, createdAt = 1): Area => ({
  id,
  code,
  name,
  createdAt,
  updatedAt: 1,
});
const deck = (id: string, areaIds: string[]): Deck => ({
  id,
  name: id,
  norm: '',
  areaIds,
  createdAt: 1,
  updatedAt: 1,
});
const areas = [
  area('oer', 'ÖR', 'Öffentliches Recht'),
  area('zr', 'ZR', 'Zivilrecht'),
  area('sr', 'SR', 'Strafrecht'),
];
const decks = [deck('amt', ['zr', 'oer']), deck('delikt', ['zr']), deck('betrug', ['sr'])];
const today = { year: 2026, month: 9, day: 28 };
const at = (d: number, h: number) => new Date(2026, 8, d, h).getTime();

describe('createdWithin', () => {
  it('zählt Lerntage, nicht Kalendertage: vor 4 Uhr gehört zum Vortag', () => {
    const times = [at(28, 10), at(29, 3), at(22, 5), at(22, 3), at(21, 20), at(29, 4)];
    // Heute ist der 28.; die letzten 7 Lerntage reichen vom 22. bis zum 28. (Lerntag endet 29. um 04:00).
    expect(createdWithin(today, times, 7)).toBe(3);
    expect(createdWithin(today, times, 1)).toBe(2);
  });
});

describe('dueByArea', () => {
  it('summiert je Rechtsgebiet in fester Reihenfolge; ein Stapel in zwei Gebieten zählt in beiden', () => {
    expect(dueByArea(areas, decks, { amt: 2, delikt: 3, betrug: 4 })).toEqual([
      { id: 'zr', code: 'ZR', name: 'Zivilrecht', due: 5 },
      { id: 'sr', code: 'SR', name: 'Strafrecht', due: 4 },
      { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht', due: 2 },
    ]);
  });
});

describe('todayInputFrom', () => {
  it('füllt Heute mit echten Karten, Rechtsgebieten und angelegten Karten', () => {
    const input = todayInputFrom(today, {
      areas,
      decks,
      cardTotal: 7,
      dueByDeck: { amt: 2, delikt: 3, betrug: 4 },
      createdAt: [at(28, 9), at(27, 9), at(1, 9)],
    });
    expect(input).toMatchObject({
      totalCards: 7,
      due: 9,
      createdThisWeek: 2,
      goal: { done: 0, target: 24 },
    });
    const model = todayModel(input);
    expect(model.headline).toEqual({ accent: '9 Karten', rest: 'warten heute.' });
    expect(model.created).toBe('+2 Karten angelegt');
    expect(model.areas.map((a) => [a.code, a.due])).toEqual([
      ['ZR', 5],
      ['SR', 4],
      ['ÖR', 2],
    ]);
    expect(model.action).toBe('learn');
  });

  it('zeigt ohne Karten den Leerzustand und ohne Rechtsgebiete keine Liste', () => {
    const model = todayModel(
      todayInputFrom(today, { areas: [], decks: [], cardTotal: 0, dueByDeck: {}, createdAt: [] }),
    );
    expect(model.headline.accent).toBe('Noch keine Karten.');
    expect(model.areas).toEqual([]);
    expect(model.created).toBeNull();
  });
});
