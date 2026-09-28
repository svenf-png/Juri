/**
 * Minimaler iCalendar-Erzeuger (RFC 5545) für einzelne Termine mit Erinnerung.
 * Wird für Fristen und Lernzeiten gebraucht (M7) und im Geräte-Check getestet.
 */

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

export function buildIcs(event: IcsEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Juri//Juri//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtc(event.now)}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.alarmMinutesBefore !== undefined) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(event.title)}`,
      `TRIGGER:-PT${Math.max(0, Math.round(event.alarmMinutesBefore))}M`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
