import { describe, expect, it } from 'vitest';
import { parseDayKey } from '../calendar/day';
import {
  cardCount,
  emptyToday,
  goalSegments,
  groupDigits,
  headline,
  lastWeek,
  todayModel,
  upcomingDeadlines,
  type TodayInput,
} from './today';

const today = parseDayKey('2026-09-28');

/** Werte aus Main.dc.html und iPadHeute.dc.html. */
const design: TodayInput = {
  today,
  totalCards: 240,
  due: 20,
  dueByArea: [
    { id: 'zr', code: 'ZR', name: 'Zivilrecht', due: 8 },
    { id: 'sr', code: 'SR', name: 'Strafrecht', due: 6 },
    { id: 'or', code: 'ÖR', name: 'Öffentliches Recht', due: 6 },
  ],
  goal: { done: 6, target: 24 },
  levels: {
    '2026-09-22': 3,
    '2026-09-23': 4,
    '2026-09-25': 2,
    '2026-09-26': 3,
    '2026-09-27': 1,
    '2026-09-28': 2,
  },
  recordDay: '2026-09-23',
  createdThisWeek: 3,
  deadlines: [
    { id: 'llm', title: 'LL.M. Modul Vertragsrecht', date: '2027-01-15' },
    { id: 'alt', title: 'Aktenvortrag', date: '2026-09-01' },
    { id: 'zr', title: 'Klausur Zivilrecht', date: '2026-10-09', secureShare: 64 },
  ],
  highFive: { id: 'mara', name: 'Mara', text: 'hat 12 Tage in Folge geschafft' },
};

describe('todayModel', () => {
  it('ergibt die Texte und Listen der Designs', () => {
    const model = todayModel({ ...design, due: 18 });
    expect(model.date).toBe('Montag, 28. September');
    expect(model.headline).toEqual({ accent: '18 Karten', rest: 'warten heute.' });
    expect(model.action).toBe('learn');
    expect(model.chip).toEqual({ title: 'Klausur Zivilrecht', when: 'in 11 Tagen' });
    expect(model.goal.segments.filter(Boolean)).toHaveLength(6);
    expect(model.goal.segments).toHaveLength(24);
    expect(model.week.map((w) => w.label)).toEqual(['Di', 'Mi', 'Do', 'Fr', 'Sa', 'So', 'Mo']);
    expect(model.week.map((w) => w.level)).toEqual([3, 4, 0, 2, 3, 1, 2]);
    expect(model.week.map((w) => w.record)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(model.week.map((w) => w.today)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(model.created).toBe('+3 Karten angelegt');
    expect(model.areas.map((a) => `${a.code} ${a.due}`)).toEqual(['ZR 8', 'SR 6', 'ÖR 6']);
    expect(model.deadlines).toEqual([
      {
        id: 'zr',
        title: 'Klausur Zivilrecht',
        detail: 'Fr, 9.10. · 64\u00A0% sitzen sicher',
        countdown: '11 T',
      },
      {
        id: 'llm',
        title: 'LL.M. Modul Vertragsrecht',
        detail: 'Fr, 15.1.2027',
        countdown: '109 T',
      },
    ]);
    expect(model.highFive?.name).toBe('Mara');
  });

  it('zeigt ohne Karten, Fristen und Verlauf einen ruhigen Leerzustand', () => {
    const model = todayModel(emptyToday(today));
    expect(model.headline).toEqual({ accent: 'Noch keine Karten.', rest: 'Leg los.' });
    expect(model.action).toBe('create');
    expect(model.chip).toBeNull();
    expect(model.created).toBeNull();
    expect(model.areas).toEqual([]);
    expect(model.deadlines).toEqual([]);
    expect(model.highFive).toBeNull();
    expect(model.goal).toMatchObject({ done: 0, target: 24 });
    expect(model.week.every((w) => w.level === 0 && !w.record)).toBe(true);
  });

  it('sortiert Rechtsgebiete nach Fälligkeit und lässt leere weg', () => {
    const model = todayModel({
      ...design,
      dueByArea: [
        { id: 'a', code: 'A', name: 'A', due: 2 },
        { id: 'b', code: 'B', name: 'B', due: 0 },
        { id: 'c', code: 'C', name: 'C', due: 5 },
        { id: 'd', code: 'D', name: 'D', due: 2 },
      ],
    });
    expect(model.areas.map((a) => a.code)).toEqual(['C', 'A', 'D']);
  });

  it('legt ohne fällige Karten eine neue Karte nahe', () => {
    expect(todayModel({ ...design, due: 0 }).action).toBe('create');
  });
});

describe('headline', () => {
  it.each([
    [0, 0, 'Noch keine Karten.', 'Leg los.'],
    [5, 0, 'Alles erledigt', 'für heute.'],
    [5, 1, '1 Karte', 'wartet heute.'],
    [5000, 1234, '1.234 Karten', 'warten heute.'],
  ])('%d Karten, %d fällig', (total, due, accent, rest) => {
    expect(headline(total, due)).toEqual({ accent, rest });
  });
});

describe('Zahlen', () => {
  it('gruppiert Tausender mit Punkt', () => {
    expect(groupDigits(0)).toBe('0');
    expect(groupDigits(999)).toBe('999');
    expect(groupDigits(1000)).toBe('1.000');
    expect(groupDigits(1234567)).toBe('1.234.567');
  });

  it('beugt „Karte“', () => {
    expect(cardCount(1)).toBe('1 Karte');
    expect(cardCount(2)).toBe('2 Karten');
    expect(cardCount(0)).toBe('0 Karten');
  });
});

describe('goalSegments', () => {
  it('ein Segment je Karte bis 24', () => {
    expect(goalSegments(6, 24)).toEqual(Array.from({ length: 24 }, (_, i) => i < 6));
    expect(goalSegments(3, 10)).toHaveLength(10);
    expect(goalSegments(30, 10).every(Boolean)).toBe(true);
  });

  it('darüber anteilig, nie mehr als voll', () => {
    const segs = goalSegments(50, 100);
    expect(segs).toHaveLength(24);
    expect(segs.filter(Boolean)).toHaveLength(12);
    expect(goalSegments(99, 100).filter(Boolean)).toHaveLength(23);
    expect(goalSegments(100, 100).filter(Boolean)).toHaveLength(24);
  });

  it('ohne Ziel keine Leiste, negative Werte zählen als 0', () => {
    expect(goalSegments(5, 0)).toEqual([]);
    expect(goalSegments(-3, 24).filter(Boolean)).toHaveLength(0);
  });
});

describe('lastWeek', () => {
  it('endet heute und markiert den Rekord nur innerhalb der Woche', () => {
    const week = lastWeek(today, {}, '2026-09-01');
    expect(week[0]?.key).toBe('2026-09-22');
    expect(week[6]?.key).toBe('2026-09-28');
    expect(week.some((w) => w.record)).toBe(false);
  });
});

describe('upcomingDeadlines', () => {
  it('lässt vergangene weg und ordnet gleiche Tage nach Titel', () => {
    const list = upcomingDeadlines(today, [
      { id: '1', title: 'Zweite', date: '2026-10-01' },
      { id: '2', title: 'Erste', date: '2026-10-01' },
      { id: '3', title: 'Heute', date: '2026-09-28' },
      { id: '4', title: 'Vorbei', date: '2026-09-27' },
    ]);
    expect(list.map((d) => d.title)).toEqual(['Heute', 'Erste', 'Zweite']);
  });

  it('meldet die Frist heute als „heute“', () => {
    const model = todayModel({
      ...design,
      deadlines: [{ id: 'x', title: 'Mündliche', date: '2026-09-28' }],
    });
    expect(model.chip).toEqual({ title: 'Mündliche', when: 'heute' });
    expect(model.deadlines[0]?.countdown).toBe('0 T');
  });
});
