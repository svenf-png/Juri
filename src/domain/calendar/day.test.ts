import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKey,
  daysBetween,
  learningDay,
  nextDayStart,
  parseDayKey,
  weekday,
  type Day,
} from './day';

const day = (key: string): Day => parseDayKey(key);

describe('learningDay', () => {
  it('beginnt um 04:00 Ortszeit', () => {
    expect(dayKey(learningDay(new Date(2026, 8, 28, 4, 0)))).toBe('2026-09-28');
    expect(dayKey(learningDay(new Date(2026, 8, 28, 3, 59)))).toBe('2026-09-27');
    expect(dayKey(learningDay(new Date(2026, 8, 28, 23, 59)))).toBe('2026-09-28');
  });

  it('geht nach Mitternacht über Monats- und Jahresgrenzen zurück', () => {
    expect(dayKey(learningDay(new Date(2026, 9, 1, 1, 30)))).toBe('2026-09-30');
    expect(dayKey(learningDay(new Date(2027, 0, 1, 0, 5)))).toBe('2026-12-31');
  });
});

describe('nextDayStart', () => {
  it('liefert den nächsten Tageswechsel um 04:00', () => {
    expect(nextDayStart(new Date(2026, 8, 28, 10, 0))).toEqual(new Date(2026, 8, 29, 4, 0));
    expect(nextDayStart(new Date(2026, 8, 28, 2, 0))).toEqual(new Date(2026, 8, 28, 4, 0));
  });
});

describe('Rechnen mit Tagen', () => {
  it('addiert über Monats-, Jahres- und Schaltjahresgrenzen', () => {
    expect(dayKey(addDays(day('2026-09-28'), 11))).toBe('2026-10-09');
    expect(dayKey(addDays(day('2026-12-31'), 1))).toBe('2027-01-01');
    expect(dayKey(addDays(day('2028-02-28'), 1))).toBe('2028-02-29');
    expect(dayKey(addDays(day('2026-09-28'), -6))).toBe('2026-09-22');
  });

  it('zählt Tage unabhängig von der Zeitumstellung', () => {
    expect(daysBetween(day('2026-09-28'), day('2026-10-09'))).toBe(11);
    expect(daysBetween(day('2026-09-28'), day('2027-01-15'))).toBe(109);
    expect(daysBetween(day('2026-03-28'), day('2026-03-30'))).toBe(2);
    expect(daysBetween(day('2026-10-09'), day('2026-09-28'))).toBe(-11);
  });

  it('kennt den Wochentag', () => {
    expect(weekday(day('2026-09-28'))).toBe(1);
    expect(weekday(day('2026-10-04'))).toBe(0);
  });
});

describe('dayKey und parseDayKey', () => {
  it('sind zueinander umkehrbar', () => {
    expect(parseDayKey('2026-09-28')).toEqual({ year: 2026, month: 9, day: 28 });
    expect(dayKey({ year: 2027, month: 1, day: 5 })).toBe('2027-01-05');
  });

  it.each(['2026-02-31', '2026-13-01', '26-09-28', '2026-9-28', ''])('lehnt %j ab', (key) => {
    expect(() => parseDayKey(key)).toThrow(RangeError);
  });
});
