import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine, toIcsUtc } from './ics';

const now = new Date('2026-09-28T10:00:00Z');

describe('toIcsUtc', () => {
  it('formatiert UTC ohne Trennzeichen und Millisekunden', () => {
    expect(toIcsUtc(new Date('2026-10-09T16:30:15.123Z'))).toBe('20261009T163015Z');
  });
});

describe('escapeIcsText', () => {
  it('maskiert Sonderzeichen und Zeilenumbrüche', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });
});

describe('foldIcsLine', () => {
  it('lässt kurze Zeilen unverändert', () => {
    expect(foldIcsLine('SUMMARY:Klausur')).toBe('SUMMARY:Klausur');
  });

  it('faltet lange Zeilen auf höchstens 75 Oktette, auch mit Umlauten', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'Prüfungsschema '.repeat(12)}`);
    const encoder = new TextEncoder();
    for (const part of folded.split('\r\n')) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(
      folded
        .split('\r\n')
        .slice(1)
        .every((p) => p.startsWith(' ')),
    ).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(`DESCRIPTION:${'Prüfungsschema '.repeat(12)}`);
  });
});

describe('buildIcs', () => {
  it('erzeugt einen Termin mit Erinnerung und CRLF-Zeilenenden', () => {
    const ics = buildIcs({
      uid: 'test-1@juri',
      title: 'Klausur Zivilrecht',
      description: 'Umfang: ZR, 3 Stapel',
      start: new Date('2026-10-09T07:00:00Z'),
      durationMinutes: 300,
      alarmMinutesBefore: 1440,
      now,
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261009T070000Z');
    expect(ics).toContain('DTEND:20261009T120000Z');
    expect(ics).toContain('DESCRIPTION:Umfang: ZR\\, 3 Stapel');
    expect(ics).toContain('TRIGGER:-PT1440M');
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VALARM')).toHaveLength(1);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('lässt Beschreibung und Erinnerung weg, wenn nicht gesetzt', () => {
    const ics = buildIcs({
      uid: 'x',
      title: 'Lernzeit',
      start: now,
      durationMinutes: 30,
      now,
    });
    expect(ics).not.toContain('DESCRIPTION');
    expect(ics).not.toContain('VALARM');
  });
});
