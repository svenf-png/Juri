/**
 * Einstellungen des Lernrhythmus (Einstellungen.dc.html). Reine Werte und Prüfregeln; gespeichert
 * werden sie als Metadaten (records.ts, Schlüssel `learning`).
 */

export type Algorithm = 'fsrs' | 'leitner';

/** Tage je Leitner-Fach, Fach 1 bis 5. */
export type LeitnerDays = [number, number, number, number, number];

export interface LearningSettings {
  readonly algorithm: Algorithm;
  /** Ziel-Behaltensquote von FSRS in Prozent (80 bis 97). */
  readonly retention: number;
  /** Neue Abfragen pro Lerntag (0 bis 100). */
  readonly newPerDay: number;
  /** Tage je Leitner-Fach, Fach 1 bis 5, aufsteigend. */
  readonly leitnerDays: LeitnerDays;
}

export const RETENTION_MIN = 80;
export const RETENTION_MAX = 97;
export const NEW_PER_DAY_MAX = 100;
export const NEW_PER_DAY_STEP = 5;
export const LEITNER_BOXES = 5;
/** Längster Abstand (Einstellungen.dc.html: „180 Tage“), für FSRS wie für Leitner. */
export const MAX_INTERVAL_DAYS = 180;
export const LEITNER_DAYS_MAX = MAX_INTERVAL_DAYS;
/** Lernschritte bei „Nochmal“ (Einstellungen.dc.html: „1 min · 10 min“). */
export const LEARNING_STEPS = ['1m', '10m'] as const;
export const RELEARNING_STEPS = ['10m'] as const;

export const DEFAULT_LEARNING: LearningSettings = {
  algorithm: 'fsrs',
  retention: 90,
  newPerDay: 20,
  leitnerDays: [1, 3, 7, 14, 30],
};

/** Voreinstellungen der Behaltensquote (Einstellungen.dc.html). */
export const RETENTION_PRESETS = [
  { name: 'Entspannt', retention: 85, load: 'weniger Last' },
  { name: 'Standard', retention: 90, load: 'ausgewogen' },
  { name: 'Examen', retention: 95, load: 'mehr Last' },
] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampRetention(n: number): number {
  return clamp(n, RETENTION_MIN, RETENTION_MAX);
}

export function clampNewPerDay(n: number): number {
  return clamp(n, 0, NEW_PER_DAY_MAX);
}

/** Neue Karten pro Tag um einen Schritt ändern; die Grenzen 0 und 100 bleiben. */
export function stepNewPerDay(current: number, direction: 1 | -1): number {
  return clampNewPerDay(current + direction * NEW_PER_DAY_STEP);
}

/**
 * Tage eines Leitner-Fachs setzen. Die Fächer bleiben aufsteigend: Ein Fach liegt nie unter dem
 * davor und nie über dem danach, sonst rückte „gewusst“ eine Karte nach vorn.
 */
export function setLeitnerDays(
  days: LeitnerDays,
  box: number,
  value: number,
): LeitnerDays {
  const index = box - 1;
  if (index < 0 || index >= LEITNER_BOXES) return days;
  const next = [...days];
  const lower = index === 0 ? 1 : (next[index - 1] ?? 1);
  const upper = index === LEITNER_BOXES - 1 ? LEITNER_DAYS_MAX : (next[index + 1] ?? LEITNER_DAYS_MAX);
  next[index] = clamp(value, lower, upper);
  return next as LeitnerDays;
}

/** Gültige Einstellungen aus gespeicherten (auch teilweise fehlenden) Werten. */
export function withDefaults(stored: Partial<LearningSettings> | undefined): LearningSettings {
  return { ...DEFAULT_LEARNING, ...stored };
}
