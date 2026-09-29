import { describe, expect, it } from 'vitest';
import { parseDayKey } from '../calendar/day';
import { countdown, longDate, numericDate, relativeDays, shortDate, weekdayShort } from './date';

const d = parseDayKey;

describe('Datumsangaben', () => {
  it('schreibt das lange Datum wie die Kopfzeile in Main.dc.html', () => {
    expect(longDate(d('2026-09-28'))).toBe('Montag, 28. September');
    expect(longDate(d('2026-03-01'))).toBe('Sonntag, 1. März');
  });

  it('kürzt Wochentage auf zwei Buchstaben ohne Punkt', () => {
    expect(
      ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map(
        (k) => weekdayShort(d(k)),
      ),
    ).toEqual(['Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  });

  it('nennt das Jahr nur, wenn es nicht das aktuelle ist', () => {
    const today = d('2026-09-28');
    expect(shortDate(d('2026-10-09'), today)).toBe('Fr, 9.10.');
    expect(shortDate(d('2027-01-15'), today)).toBe('Fr, 15.1.2027');
  });

  it.each([
    ['2026-09-28', 'heute'],
    ['2026-09-29', 'morgen'],
    ['2026-10-09', 'in 11 Tagen'],
    ['2026-09-27', 'gestern'],
    ['2026-09-25', 'vor 3 Tagen'],
  ])('relativ zu heute: %s → %s', (key, text) => {
    expect(relativeDays(d('2026-09-28'), d(key))).toBe(text);
  });

  it('zählt Countdowns in Tagen, nie negativ', () => {
    expect(countdown(d('2026-09-28'), d('2026-10-09'))).toBe('11 T');
    expect(countdown(d('2026-09-28'), d('2027-01-15'))).toBe('109 T');
    expect(countdown(d('2026-09-28'), d('2026-09-20'))).toBe('0 T');
  });
});

describe('numericDate', () => {
  it('schreibt Tag, Monat und Jahr zweistellig nach deutscher Art', () => {
    expect(numericDate(new Date(2026, 8, 5, 13).getTime())).toBe('05.09.2026');
    expect(numericDate(new Date(2027, 11, 31, 23, 59).getTime())).toBe('31.12.2027');
  });
});
