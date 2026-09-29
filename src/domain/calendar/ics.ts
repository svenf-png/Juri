/**
 * Minimaler iCalendar-Erzeuger (RFC 5545) für Termine mit Erinnerung: zeitgenau (Geräte-Check)
 * und ganztägig (Fristen, M8), einzeln oder mehrere in einer Datei.
 */
import { addDays, dayKey, type Day } from './day';

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  durationMinutes: number;
  /** Erinnerung so viele Minuten vor Beginn; weglassen für keine Erinnerung. */
  alarmMinutesBefore?: number;
  /** Zeitstempel der Erzeugung (DTSTAMP). */
  now: Date;
}

/** Ganztägiger Termin an einem Kalendertag (DTSTART;VALUE=DATE, ohne Zeitzone). */
export interface IcsDayEvent {
  uid: string;
  title: string;
  description?: string;
  day: Day;
  /**
   * Erinnerung so viele Minuten vor Beginn des Tages (00:00 im Kalender des Nutzers); negativ
   * heißt danach, z. B. -540 für 09:00 am selben Tag. Weglassen für keine Erinnerung.
   */
  alarmMinutesBefore?: number;
  now: Date;
}

/** Datum als UTC im Format 20260928T160000Z. */
export function toIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Maskiert Text nach RFC 5545, Abschnitt 3.3.11. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Faltet Zeilen auf höchstens 75 Oktette (RFC 5545, Abschnitt 3.1). */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74; // Folgezeilen beginnen mit einem Leerzeichen
    if (bytes.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function alarmLines(title: string, trigger: string): string[] {
  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
  ];
}

function compact(day: Day): string {
  return dayKey(day).replace(/-/g, '');
}

function timedLines(event: IcsEvent): string[] {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtc(event.now)}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.alarmMinutesBefore !== undefined) {
    const minutes = Math.max(0, Math.round(event.alarmMinutesBefore));
    lines.push(...alarmLines(event.title, `-PT${String(minutes)}M`));
  }
  lines.push('END:VEVENT');
  return lines;
}

function dayLines(event: IcsDayEvent): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtc(event.now)}`,
    `DTSTART;VALUE=DATE:${compact(event.day)}`,
    `DTEND;VALUE=DATE:${compact(addDays(event.day, 1))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.alarmMinutesBefore !== undefined) {
    const before = Math.round(event.alarmMinutesBefore);
    const trigger = before >= 0 ? `-PT${String(before)}M` : `PT${String(-before)}M`;
    lines.push(...alarmLines(event.title, trigger));
  }
  lines.push('END:VEVENT');
  return lines;
}

/** Kalenderdatei mit beliebig vielen Terminen, Zeilen mit CRLF (RFC 5545, Abschnitt 3.1). */
export function buildIcsCalendar(events: readonly (IcsEvent | IcsDayEvent)[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Juri//Juri//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => ('day' in event ? dayLines(event) : timedLines(event))),
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function buildIcs(event: IcsEvent): string {
  return buildIcsCalendar([event]);
}
