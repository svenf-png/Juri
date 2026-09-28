/**
 * Lerntage (Entscheidung 6): Ein Tag beginnt um 04:00 in der Gerätezeitzone. Wer um 01:30
 * noch lernt, lernt für den Vortag. Tage sind reine Kalenderdaten ohne Uhrzeit; gerechnet wird
 * in UTC, damit Sommer- und Winterzeit keine Tage verschieben.
 */

/** Kalendertag; `month` zählt von 1 bis 12. */
export interface Day {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Stunde, zu der ein neuer Lerntag beginnt. */
export const DAY_START_HOUR = 4;

const MS_PER_DAY = 86_400_000;

/** Lerntag zum Zeitpunkt `now`, nach der Uhr des Geräts. */
export function learningDay(now: Date): Day {
  const shift = now.getHours() < DAY_START_HOUR ? 1 : 0;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - shift);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Beginn des nächsten Lerntags (04:00 Ortszeit) nach `now`. */
export function nextDayStart(now: Date): Date {
  const today = learningDay(now);
  return new Date(today.year, today.month - 1, today.day + 1, DAY_START_HOUR);
}

function utc(d: Day): number {
  return Date.UTC(d.year, d.month - 1, d.day);
}

function fromUtc(ms: number): Day {
  const date = new Date(ms);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function addDays(d: Day, n: number): Day {
  return fromUtc(utc(d) + n * MS_PER_DAY);
}

/** Ganze Tage von `from` bis `to`; negativ, wenn `to` davor liegt. */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((utc(to) - utc(from)) / MS_PER_DAY);
}

/** Wochentag, 0 = Sonntag bis 6 = Samstag. */
export function weekday(d: Day): number {
  return new Date(utc(d)).getUTCDay();
}

/** Schlüssel „JJJJ-MM-TT“, z. B. für Tagesaggregate und Fristen. */
export function dayKey(d: Day): string {
  const mm = String(d.month).padStart(2, '0');
  const dd = String(d.day).padStart(2, '0');
  return `${String(d.year).padStart(4, '0')}-${mm}-${dd}`;
}

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Liest „JJJJ-MM-TT“; wirft bei ungültigen Daten wie dem 31. Februar. */
export function parseDayKey(key: string): Day {
  const match = KEY.exec(key);
  if (match) {
    const d = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    if (dayKey(fromUtc(utc(d))) === key) return d;
  }
  throw new RangeError(`Ungültiger Tag: ${key}`);
}
