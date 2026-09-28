/**
 * Deutsche Datumsangaben für die Oberfläche. Bewusst ohne Intl: Namen und Schreibweisen sind
 * damit auf jedem Gerät und in jedem Test gleich („Mo“ statt „Mo.“).
 */
import { daysBetween, weekday, type Day } from '../calendar/day';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** „Mo“, „Di“ … wie in der Wochenansicht (Main.dc.html). */
export function weekdayShort(d: Day): string {
  return (WEEKDAYS[weekday(d)] ?? '').slice(0, 2);
}

/** „Montag, 28. September“ (Main.dc.html, Kopfzeile). */
export function longDate(d: Day): string {
  return `${WEEKDAYS[weekday(d)] ?? ''}, ${d.day}. ${MONTHS[d.month - 1] ?? ''}`;
}

/** „Fr, 9.10.“, in einem anderen Jahr als `today` mit Jahr: „Fr, 15.1.2027“ (iPadHeute). */
export function shortDate(d: Day, today: Day): string {
  const year = d.year === today.year ? '' : String(d.year);
  return `${weekdayShort(d)}, ${d.day}.${d.month}.${year}`;
}

/** „heute“, „morgen“, „in 11 Tagen“; vergangene Tage: „vor 2 Tagen“. */
export function relativeDays(from: Day, to: Day): string {
  const n = daysBetween(from, to);
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n === -1) return 'gestern';
  return n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;
}

/** Kurzform für Countdowns: „11 T“ (iPadHeute, Nächste Fristen). */
export function countdown(from: Day, to: Day): string {
  return `${Math.max(0, daysBetween(from, to))} T`;
}
