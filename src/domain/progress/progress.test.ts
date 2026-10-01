import { afterEach, describe, expect, it } from 'vitest';
import { addDays, dayKey, parseDayKey, type Day } from '../calendar/day';
import type { DayRow } from '../model/records';
import { availableDays, openSpans } from './availability';
import { caption, fertigModel } from './celebrate';
import { erfolgeModel, streakNotes } from './erfolge';
import {
  clampCreateGoal,
  clampLearnGoal,
  crossedLearnGoal,
  DEFAULT_GOALS,
  learnStep,
  metGoal,
  withDefaultGoals,
} from './goals';
import { heatmap } from './heatmap';
import { levelOf, quantile, recordOf, thresholds } from './levels';
import { badges, MILESTONES, newlyReached, NO_METRICS, type Unlock } from './milestones';
import { streak, weekStart } from './streak';
import { dayOfTime, dayStats, totals, type StatEvent } from './stats';
import { activity, rankOf, weekActivity } from './summary';

const day = (key: string): Day => parseDayKey(key);
const at = (key: string, hour = 12): number => {
  const d = day(key);
  return new Date(d.year, d.month - 1, d.day, hour).getTime();
};
const review = (key: string, item: string, hour = 12): StatEvent => ({
  at: at(key, hour),
  type: 'reviewed',
  itemId: item,
});
const undo = (key: string, item: string, hour = 12): StatEvent => ({
  at: at(key, hour),
  type: 'reviewUndone',
  itemId: item,
});
const created = (key: string, hour = 12): StatEvent => ({ at: at(key, hour), type: 'cardCreated' });

const previousTz = process.env.TZ;
afterEach(() => {
  if (previousTz === undefined) delete process.env.TZ;
  else process.env.TZ = previousTz;
});

describe('dayStats', () => {
  it('ist bei leerer Historie leer', () => {
    expect(dayStats([]).size).toBe(0);
    expect(totals([])).toEqual({ reviews: 0, learned: 0, created: 0 });
  });

  it('zählt jede Bewertung, aber jede Abfrage nur einmal als gelernt', () => {
    const stats = dayStats([
      review('2026-09-28', 'a'),
      review('2026-09-28', 'a'),
      review('2026-09-28', 'b'),
      created('2026-09-28'),
      created('2026-09-27'),
    ]);
    expect(stats.get('2026-09-28')).toEqual({ reviews: 3, learned: 2, created: 1 });
    expect(stats.get('2026-09-27')).toEqual({ reviews: 0, learned: 0, created: 1 });
  });

  it('hebt bei Undo eine Bewertung im Aggregat auf', () => {
    const stats = dayStats([review('2026-09-28', 'a'), undo('2026-09-28', 'a')]);
    expect(stats.has('2026-09-28')).toBe(false);
    const two = dayStats([
      review('2026-09-28', 'a'),
      review('2026-09-28', 'a'),
      undo('2026-09-28', 'a'),
    ]);
    expect(two.get('2026-09-28')).toEqual({ reviews: 1, learned: 1, created: 0 });
  });

  it('rechnet Undo dem Tag der Bewertung zu, auch nach dem Tageswechsel', () => {
    const stats = dayStats([
      review('2026-09-28', 'a', 23),
      review('2026-09-28', 'b', 23),
      undo('2026-09-29', 'a', 5),
    ]);
    expect(stats.get('2026-09-28')).toEqual({ reviews: 1, learned: 1, created: 0 });
    expect(stats.has('2026-09-29')).toBe(false);
  });

  it('ignoriert ein Undo ohne Bewertung davor', () => {
    expect(dayStats([undo('2026-09-28', 'a')]).size).toBe(0);
  });

  it('ordnet Ereignisse nach dem Lerntag: vor 04:00 gehört zum Vortag', () => {
    const stats = dayStats([review('2026-09-29', 'a', 3), review('2026-09-29', 'b', 4)]);
    expect(stats.get('2026-09-28')?.reviews).toBe(1);
    expect(stats.get('2026-09-29')?.reviews).toBe(1);
    expect(dayOfTime(at('2026-09-29', 3))).toBe('2026-09-28');
  });

  it('bleibt über die Zeitumstellung in Europe/Berlin bei ganzen Lerntagen', () => {
    process.env.TZ = 'Europe/Berlin';
    // 25.10.2026: 25 Stunden. 03:59 gehört noch zum 24., 04:00 zum 25.
    expect(dayOfTime(new Date(2026, 9, 25, 3, 59).getTime())).toBe('2026-10-24');
    expect(dayOfTime(new Date(2026, 9, 25, 4, 0).getTime())).toBe('2026-10-25');
    expect(dayOfTime(new Date(2026, 9, 26, 3, 59).getTime())).toBe('2026-10-25');
    // 29.03.2026: 23 Stunden, 04:00 Sommerzeit ist der Beginn des Lerntags.
    expect(dayOfTime(new Date(2026, 2, 29, 4, 0).getTime())).toBe('2026-03-29');
    expect(dayOfTime(new Date(2026, 2, 30, 3, 59).getTime())).toBe('2026-03-29');
  });
});

describe('Ziele', () => {
  it('ein Ziel genügt, das Anlegen-Ziel zählt', () => {
    expect(metGoal({ learned: 24, created: 0 }, DEFAULT_GOALS)).toBe(true);
    expect(metGoal({ learned: 0, created: 5 }, DEFAULT_GOALS)).toBe(true);
    expect(metGoal({ learned: 23, created: 4 }, DEFAULT_GOALS)).toBe(false);
  });

  it('Voreinstellung 24 und 5 mit Pausentag; Werte werden begrenzt', () => {
    expect(withDefaultGoals(undefined)).toEqual({ learn: 24, create: 5, pause: true });
    expect(withDefaultGoals({ learn: 0, create: 999, pause: false })).toEqual({
      learn: 1,
      create: 50,
      pause: false,
    });
    expect(clampLearnGoal(Number.NaN)).toBe(1);
    expect(clampLearnGoal(500)).toBe(100);
    expect(clampCreateGoal(2.6)).toBe(3);
  });

  it('der Regler geht bis 24 in Einern, darüber in Vierern', () => {
    expect(learnStep(23, 1)).toBe(24);
    expect(learnStep(24, 1)).toBe(28);
    expect(learnStep(28, -1)).toBe(24);
    expect(learnStep(24, -1)).toBe(23);
    expect(learnStep(1, -1)).toBe(1);
    expect(learnStep(99, 1)).toBe(100);
  });

  it('erkennt, ob das Ziel in einer Session neu erreicht wurde', () => {
    expect(crossedLearnGoal(20, 24, DEFAULT_GOALS)).toBe(true);
    expect(crossedLearnGoal(24, 30, DEFAULT_GOALS)).toBe(false);
    expect(crossedLearnGoal(0, 10, DEFAULT_GOALS)).toBe(false);
  });
});

describe('Stufen', () => {
  it('Quantile mit Interpolation', () => {
    expect(quantile([10, 20], 0.5)).toBe(15);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([7], 0.9)).toBe(7);
  });

  it('ein Tag ohne Aktivität ist Stufe 0, auch ohne jeden Verlauf', () => {
    expect(levelOf(0, thresholds([]))).toBe(0);
    expect(levelOf(5, thresholds([]))).toBe(1);
  });

  it('bei einem einzigen Tag und bei lauter gleichen Tagen ist die Stufe 4', () => {
    expect(levelOf(9, thresholds([9]))).toBe(4);
    expect(levelOf(9, thresholds([9, 9, 9]))).toBe(4);
  });

  it('bei zwei Tagen ist der kleinere 1, der größere 4', () => {
    const t = thresholds([10, 20]);
    expect(levelOf(10, t)).toBe(1);
    expect(levelOf(20, t)).toBe(4);
  });

  it('verteilt viele Tage auf alle vier Stufen, Nullen zählen nicht mit', () => {
    const values = [0, 0, ...Array.from({ length: 100 }, (_, i) => i + 1)];
    const t = thresholds(values);
    const count = [0, 0, 0, 0, 0];
    for (const v of values) count[levelOf(v, t)] = (count[levelOf(v, t)] ?? 0) + 1;
    expect(count[0]).toBe(2);
    for (const level of [1, 2, 3, 4]) expect(count[level]).toBeGreaterThanOrEqual(24);
    expect(levelOf(1, t)).toBe(1);
    expect(levelOf(100, t)).toBe(4);
  });

  it('Rekord: der größte Wert, bei Gleichstand der frühere Tag', () => {
    expect(recordOf(new Map())).toBeNull();
    expect(recordOf(new Map([['2026-09-01', 0]]))).toBeNull();
    const map = new Map([
      ['2026-09-10', 40],
      ['2026-09-03', 40],
      ['2026-09-05', 12],
    ]);
    expect(recordOf(map)).toEqual({ day: '2026-09-03', value: 40 });
  });
});

const row = (key: string, reviews: number, created = 0, met = reviews >= 24): DayRow => ({
  day: key,
  reviews,
  learned: reviews,
  created,
  met,
});

describe('Aktivität', () => {
  const rows = [row('2026-09-20', 10), row('2026-09-21', 86), row('2026-09-22', 40, 3)];

  it('Gelernt und Angelegt haben eigene Stufen und Rekorde', () => {
    expect(activity(rows, 'learn').record).toEqual({ day: '2026-09-21', value: 86 });
    expect(activity(rows, 'make').record).toEqual({ day: '2026-09-22', value: 3 });
    expect(activity(rows, 'learn').level('2026-09-21')).toBe(4);
    expect(activity(rows, 'learn').level('2026-09-01')).toBe(0);
  });

  it('Heute: nur angelegte Karten sind mindestens Stufe 1', () => {
    const { levels, recordDay } = weekActivity([...rows, row('2026-09-23', 0, 5, true)]);
    expect(levels['2026-09-23']).toBe(1);
    expect(recordDay).toBe('2026-09-21');
    expect(weekActivity([])).toEqual({ levels: {}, recordDay: null });
  });

  it('Rang: Gleichstand teilt den Rang, ohne Wiederholung kein Rang', () => {
    const r = [row('2026-09-01', 50), row('2026-09-02', 50), row('2026-09-03', 20)];
    expect(rankOf(r, '2026-09-01')).toBe(1);
    expect(rankOf(r, '2026-09-02')).toBe(1);
    expect(rankOf(r, '2026-09-03')).toBe(3);
    expect(rankOf(r, '2026-09-04')).toBeNull();
  });
});

describe('Verfügbarkeit', () => {
  it('eine nie bewertete Abfrage ist ab dem Anlegen offen', () => {
    expect(openSpans({ createdAt: 100, due: undefined, log: [] })).toEqual([
      { from: 100, to: null },
    ]);
  });

  it('zwischen Bewertung und nächster Fälligkeit ist die Abfrage nicht offen', () => {
    const spans = openSpans({
      createdAt: at('2026-09-01'),
      due: at('2026-09-20'),
      log: [
        { at: at('2026-09-02'), dueBefore: undefined },
        { at: at('2026-09-10'), dueBefore: at('2026-09-09') },
      ],
    });
    expect(spans).toEqual([
      { from: at('2026-09-01'), to: at('2026-09-02') },
      { from: at('2026-09-09'), to: at('2026-09-10') },
      { from: at('2026-09-20'), to: null },
    ]);
  });

  it('eine zu früh bewertete Abfrage war nie offen', () => {
    expect(
      openSpans({
        createdAt: 1,
        due: 900,
        log: [
          { at: 10, dueBefore: 500 },
          { at: 20, dueBefore: 700 },
        ],
      }),
    ).toEqual([{ from: 900, to: null }]);
  });

  it('Tage von der Fälligkeit bis zur Bewertung sind verfügbar, Lücken nicht', () => {
    const spans = [
      { from: at('2026-09-02', 10), to: at('2026-09-04', 9) },
      { from: at('2026-09-08', 10), to: null },
    ];
    const days = availableDays(spans, day('2026-09-01'), day('2026-09-10'));
    expect([...days].sort()).toEqual([
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
    ]);
    expect(availableDays([], day('2026-09-01'), day('2026-09-03')).size).toBe(0);
    expect(availableDays(spans, day('2026-09-10'), day('2026-09-01')).size).toBe(0);
  });

  it('eine Fälligkeit um 03:00 zählt zum Vortag (Lerntag endet um 04:00)', () => {
    const days = availableDays(
      [{ from: at('2026-09-05', 3), to: at('2026-09-05', 3) + 1000 }],
      day('2026-09-01'),
      day('2026-09-10'),
    );
    expect([...days]).toEqual(['2026-09-04']);
  });
});

describe('Serie', () => {
  const all = () => true;
  const none = () => false;
  const run = (keys: string[], missed: string[] = []) =>
    new Map<string, boolean>([
      ...keys.map((k) => [k, true] as const),
      ...missed.map((k) => [k, false] as const),
    ]);

  it('ohne Verlauf ist die Serie 0', () => {
    expect(
      streak({ met: new Map(), today: day('2026-09-28'), pause: true, available: all }),
    ).toEqual({
      current: 0,
      best: 0,
      todayMet: false,
      pauseUsedThisWeek: false,
    });
  });

  it('zählt aufeinanderfolgende Tage inklusive heute', () => {
    const met = run(['2026-09-26', '2026-09-27', '2026-09-28']);
    const r = streak({ met, today: day('2026-09-28'), pause: true, available: all });
    expect(r).toMatchObject({ current: 3, best: 3, todayMet: true });
  });

  it('heute offen: die Serie bis gestern bleibt, ohne dass der Pausentag verbraucht wird', () => {
    const met = run(['2026-09-26', '2026-09-27']);
    const r = streak({ met, today: day('2026-09-28'), pause: true, available: all });
    expect(r).toMatchObject({ current: 2, todayMet: false, pauseUsedThisWeek: false });
  });

  it('Pausentag: der erste verpasste Tag der Woche bricht nicht, der zweite schon', () => {
    // Woche 21.9. (Mo) bis 27.9. (So); 28.9. ist Montag.
    const one = run(['2026-09-21', '2026-09-23', '2026-09-24', '2026-09-25']);
    const r1 = streak({ met: one, today: day('2026-09-25'), pause: true, available: all });
    expect(r1.current).toBe(4);
    const two = run(['2026-09-21', '2026-09-24', '2026-09-25']);
    const r2 = streak({ met: two, today: day('2026-09-25'), pause: true, available: all });
    // Di und Mi fehlen: Di ist Pausentag, Mi bricht. Ab Do neu: Do, Fr.
    expect(r2.current).toBe(2);
    expect(r2.best).toBe(2);
  });

  it('der Pausentag gilt je Woche neu (Montag bis Sonntag)', () => {
    // Sa 19.9. fehlt (Woche 14.9.), Mi 23.9. fehlt (Woche 21.9.): beide frei.
    const met = run([
      '2026-09-17',
      '2026-09-18',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-24',
      '2026-09-25',
    ]);
    const r = streak({ met, today: day('2026-09-25'), pause: true, available: all });
    expect(r.current).toBe(7);
    expect(r.pauseUsedThisWeek).toBe(true);
  });

  it('Sonntag und Montag fehlen: zwei Wochen, zwei Pausentage', () => {
    const met = run(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-29']);
    const r = streak({ met, today: day('2026-09-29'), pause: true, available: all });
    expect(r.current).toBe(4);
  });

  it('ohne Pausentag bricht der erste verpasste Tag', () => {
    const met = run(['2026-09-23', '2026-09-25']);
    const r = streak({ met, today: day('2026-09-25'), pause: false, available: all });
    expect(r.current).toBe(1);
  });

  it('Tage ohne verfügbare Karten brechen nicht und zählen nicht', () => {
    const met = run(['2026-09-20', '2026-09-24', '2026-09-25']);
    const r = streak({ met, today: day('2026-09-25'), pause: false, available: none });
    expect(r.current).toBe(3);
    // Nur ein einzelner Tag ist verfügbar gewesen und wurde verpasst.
    const onlyThe22nd = streak({
      met,
      today: day('2026-09-25'),
      pause: false,
      available: (k) => k === '2026-09-22',
    });
    expect(onlyThe22nd.current).toBe(2);
  });

  it('der Anlegen-Tag zählt wie ein Lerntag (met kommt aus den Zielen)', () => {
    const rows = [row('2026-09-27', 0, 5, true), row('2026-09-28', 30)];
    const met = new Map(rows.map((r) => [r.day, r.met]));
    expect(streak({ met, today: day('2026-09-28'), pause: true, available: all }).current).toBe(2);
  });

  it('ein Tag mit Aktivität unter dem Ziel ist ein verpasster Tag', () => {
    const met = new Map([
      ['2026-09-26', true],
      ['2026-09-27', false],
      ['2026-09-28', true],
    ]);
    // Der Pausentag hält die Serie, zählt aber nicht mit.
    expect(streak({ met, today: day('2026-09-28'), pause: true, available: all }).current).toBe(2);
    expect(streak({ met, today: day('2026-09-28'), pause: false, available: all }).current).toBe(1);
  });

  it('längste Serie bleibt, auch wenn die aktuelle abbricht', () => {
    const met = run(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-20'],
      ['2026-09-05', '2026-09-06'],
    );
    const r = streak({ met, today: day('2026-09-20'), pause: false, available: all });
    expect(r).toMatchObject({ current: 1, best: 4 });
  });

  it('Wochenanfang ist der Montag', () => {
    expect(dayKey(weekStart(day('2026-09-27')))).toBe('2026-09-21');
    expect(dayKey(weekStart(day('2026-09-28')))).toBe('2026-09-28');
    expect(dayKey(weekStart(day('2026-09-24')))).toBe('2026-09-21');
  });

  it('rechnet über die Zeitumstellung in ganzen Tagen', () => {
    process.env.TZ = 'Europe/Berlin';
    const keys: string[] = [];
    for (let i = 0; i < 8; i++) keys.push(dayKey(addDays(day('2026-10-22'), i)));
    const r = streak({ met: run(keys), today: day('2026-10-29'), pause: true, available: all });
    expect(r.current).toBe(8);
  });
});

describe('Meilensteine', () => {
  const metrics = { ...NO_METRICS, created: 100, streak: 7 };

  it('schaltet frei, was erreicht ist, und nur einmal', () => {
    const first = newlyReached(metrics, new Set());
    expect(first.map((m) => m.id)).toEqual(['erste-karte', 'angelegt-100', 'serie-7']);
    const again = newlyReached(metrics, new Set(first.map((m) => m.id)));
    expect(again).toEqual([]);
  });

  it('nichts freischalten ohne Fortschritt; eine sinkende Serie nimmt nichts zurück', () => {
    expect(newlyReached(NO_METRICS, new Set())).toEqual([]);
    expect(newlyReached({ ...NO_METRICS, streak: 0 }, new Set(['serie-7']))).toEqual([]);
  });

  it('Abzeichen: Fortschritt, geschafft, frisch', () => {
    const unlocked = new Map<string, Unlock>([
      ['erste-karte', { unlockedAt: 1, seen: true }],
      ['angelegt-100', { unlockedAt: 2, seen: false }],
    ]);
    const list = badges({ ...NO_METRICS, created: 100, schemas: 7, reviews: 1000 }, unlocked);
    expect(list).toHaveLength(MILESTONES.length);
    expect(list[0]).toMatchObject({ sub: 'geschafft', fraction: 1, fresh: false });
    expect(list[1]).toMatchObject({ done: true, fresh: true });
    expect(list[2]).toMatchObject({ name: 'Schema-Baumeister', sub: '7 von 10', done: false });
    expect(list[2]?.fraction).toBeCloseTo(0.7);
    // Kennzahl erreicht, Freischaltung noch nicht geschrieben: zeigt schon geschafft.
    expect(list[4]).toMatchObject({ done: true, fresh: false });
    expect(list[3]).toMatchObject({ sub: '0 von 7', fraction: 0 });
  });

  it('Tausenderpunkte im Zwischenstand', () => {
    const list = badges({ ...NO_METRICS, reviews: 812 }, new Map());
    expect(list.find((b) => b.id === 'wiederholungen-1000')?.sub).toBe('812 von 1.000');
  });
});

describe('Heatmap', () => {
  const today = day('2026-09-28'); // Montag
  const build = (weeks: number, record: string | null = null) =>
    heatmap({
      today,
      weeks,
      level: (k) => (k === '2026-09-23' ? 4 : 2),
      record,
      tip: (k) => k,
    });

  it('hat je Woche sieben Zellen, die letzte Woche endet am heutigen Tag', () => {
    const h = build(12);
    expect(h.cells).toHaveLength(84);
    expect(h.cells[77]?.key).toBe('2026-09-28');
    expect(h.cells[77]?.level).toBe(2);
    expect(h.cells[78]?.level).toBeNull();
    expect(h.cells[83]?.level).toBeNull();
    expect(h.cells[0]?.key).toBe('2026-07-13');
  });

  it('markiert den Rekordtag und beschriftet Monate wie das Design', () => {
    expect(
      build(12, '2026-09-23')
        .cells.filter((c) => c.record)
        .map((c) => c.key),
    ).toEqual(['2026-09-23']);
    expect(build(12).months).toEqual(['Juli', 'August', 'September']);
    expect(build(26).months).toEqual(['April', 'Mai', 'Juni', 'Juli', 'August', 'September']);
  });

  it('mitten in der Woche liegen die Tage danach in der Zukunft', () => {
    const h = heatmap({
      today: day('2026-09-30'),
      weeks: 1,
      level: () => 1,
      record: null,
      tip: () => '',
    });
    expect(h.cells.map((c) => c.level)).toEqual([1, 1, 1, null, null, null, null]);
  });
});

describe('Erfolge', () => {
  const today = day('2026-09-28');
  const base = {
    today,
    goals: DEFAULT_GOALS,
    metrics: NO_METRICS,
    unlocked: new Map<string, Unlock>(),
  };

  it('leerer Verlauf: Leerzustand, Serie 0, kein Rekord', () => {
    const m = erfolgeModel({
      ...base,
      rows: [],
      streak: { current: 0, best: 0, todayMet: false, pauseUsedThisWeek: false },
    });
    expect(m.empty).toBe(true);
    expect(m.streak).toMatchObject({ days: 0, unit: 'Tage in Folge', noteShort: 'Heute starten' });
    expect(m.heat.learn.recordText).toBe('Noch kein Rekord');
    expect(m.heat.make.recordText).toBe('Noch keine Karte angelegt');
    expect(m.reviews).toEqual({ value: '0', label: 'Wiederholungen' });
    expect(m.highFives).toBeNull();
    expect(m.fresh).toEqual([]);
  });

  it('Texte wie im Design', () => {
    const rows = [row('2026-09-23', 86), row('2026-09-12', 0, 31, true), row('2026-09-24', 1198)];
    const m = erfolgeModel({
      ...base,
      rows: [row('2026-09-23', 86), row('2026-09-12', 0, 31, true)],
      streak: { current: 12, best: 12, todayMet: true, pauseUsedThisWeek: false },
    });
    expect(m.empty).toBe(false);
    expect(m.streak.note).toBe(
      '1 Pausentag pro Woche ist frei. Die Serie bleibt stehen, nichts geht verloren.',
    );
    expect(m.heat.learn.recordText).toBe('Rekord: Mi, 23.9. · 86 Wiederholungen');
    expect(m.heat.make.recordText).toBe('Rekord: Sa, 12.9. · 31 Karten angelegt');
    expect(rows).toHaveLength(3);
    expect(m.reviews.value).toBe('86');
    expect(m.created.label).toBe('Karten angelegt');
  });

  it('Tausenderpunkte, Einzahl und High fives (ab M11)', () => {
    const m = erfolgeModel({
      ...base,
      rows: [row('2026-09-23', 1284, 1, true)],
      streak: { current: 1, best: 1, todayMet: true, pauseUsedThisWeek: false },
      highFives: { received: 2, open: 2, names: 'Mara und Jonas' },
    });
    expect(m.reviews.value).toBe('1.284');
    expect(m.created).toEqual({ value: '1', label: 'Karte angelegt' });
    expect(m.streak.unit).toBe('Tag in Folge');
    expect(m.highFives).toEqual({
      title: '2 High fives bekommen',
      sub: 'Mara und Jonas · 2 Erfolge zum Abklatschen',
    });
  });

  it('Serientexte: Pausentag genutzt, ohne Pausentag', () => {
    const s = { current: 5, best: 5, todayMet: true, pauseUsedThisWeek: true };
    expect(streakNotes(s, DEFAULT_GOALS).noteShort).toBe('Pausentag genutzt');
    expect(streakNotes(s, { ...DEFAULT_GOALS, pause: false }).noteShort).toBe('Ohne Pausentag');
  });

  it('Tooltips nennen Tag und Zahl', () => {
    const m = erfolgeModel({
      ...base,
      rows: [row('2026-09-28', 1), row('2026-09-27', 40)],
      streak: { current: 2, best: 2, todayMet: true, pauseUsedThisWeek: false },
    });
    const cells = m.heat.learn.phone.cells;
    expect(cells.find((c) => c.key === '2026-09-28')?.tip).toBe('Mo, 28.9.: 1 Wiederholung');
    expect(cells.find((c) => c.key === '2026-09-27')?.tip).toBe('So, 27.9.: 40 Wiederholungen');
    expect(cells.find((c) => c.key === '2026-09-26')?.tip).toBe('Sa, 26.9.: nichts gelernt');
  });
});

describe('Feier', () => {
  const today = day('2026-09-28');
  const rows = [row('2026-09-24', 90), row('2026-09-25', 40), row('2026-09-28', 60)];

  it('nennt den Rang von heute', () => {
    expect(caption(1, 4)).toBe('Heute leuchtet voll: dein stärkster Tag.');
    expect(caption(2, 4)).toBe('Heute leuchtet voll: dein zweitstärkster Tag.');
    expect(caption(3, 2)).toBe('Heute leuchtet voll: dein drittstärkster Tag.');
    expect(caption(7, 4)).toBe('Heute leuchtet voll.');
    expect(caption(null, 0)).toBe('Geschafft. Morgen geht es weiter.');
  });

  it('Zusammenfassung mit Serie und Wochenleiste', () => {
    const fresh = badges({ ...NO_METRICS, reviews: 1000 }, new Map()).filter(
      (b) => b.id === 'wiederholungen-1000',
    );
    const m = fertigModel({ today, rows, target: 24, streak: 13, fresh });
    expect(m.summary).toBe('60 von 24 Karten · 13 Tage in Folge');
    expect(m.week).toHaveLength(7);
    expect(m.week.at(-1)).toMatchObject({ key: '2026-09-28', today: true });
    expect(m.caption).toBe('Heute leuchtet voll: dein zweitstärkster Tag.');
    expect(m.milestone?.id).toBe('wiederholungen-1000');
    expect(m.moreMilestones).toBe(0);
  });

  it('Serie 1 im Singular, ohne Serie keine Angabe, weitere Meilensteine werden gezählt', () => {
    const list = badges({ ...NO_METRICS, created: 100 }, new Map());
    const fresh = list.filter((b) => b.done);
    expect(fertigModel({ today, rows, target: 24, streak: 1, fresh }).summary).toContain(
      '1 Tag in Folge',
    );
    const m = fertigModel({ today, rows, target: 24, streak: 0, fresh });
    expect(m.summary).toBe('60 von 24 Karten');
    expect(m.moreMilestones).toBe(1);
  });
});

describe('Teamplayer (M10)', () => {
  it('zählt geteilte Stapel und schaltet bei drei frei', () => {
    const list = badges({ ...NO_METRICS, shared: 1 }, new Map());
    const team = list.find((b) => b.id === 'teamplayer');
    expect(team?.sub).toBe('1 von 3 geteilt');
    expect(team?.done).toBe(false);
    expect(newlyReached({ ...NO_METRICS, shared: 2 }, new Set()).map((m) => m.id)).toEqual([]);
    expect(newlyReached({ ...NO_METRICS, shared: 3 }, new Set()).map((m) => m.id)).toEqual([
      'teamplayer',
    ]);
    expect(
      badges({ ...NO_METRICS, shared: 3 }, new Map()).find((b) => b.id === 'teamplayer')?.sub,
    ).toBe('geschafft');
  });

  it('steht wie im Design an letzter Stelle', () => {
    expect(MILESTONES.map((m) => m.id)).toEqual([
      'erste-karte',
      'angelegt-100',
      'schema-baumeister',
      'serie-7',
      'wiederholungen-1000',
      'teamplayer',
    ]);
  });
});
