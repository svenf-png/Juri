/** Bewertungen: vier Stufen wie in Lernen.dc.html, gespeichert als 1 bis 4 (ts-fsrs: Grade). */

export type RatingKey = 'again' | 'hard' | 'good' | 'easy';
export type RatingValue = 1 | 2 | 3 | 4;

export const RATING_KEYS: readonly RatingKey[] = ['again', 'hard', 'good', 'easy'];

export const RATING_LABEL: Readonly<Record<RatingKey, string>> = {
  again: 'Nochmal',
  hard: 'Schwer',
  good: 'Gut',
  easy: 'Leicht',
};

export function ratingValue(key: RatingKey): RatingValue {
  return (RATING_KEYS.indexOf(key) + 1) as RatingValue;
}

export function ratingKey(value: number): RatingKey {
  const key = RATING_KEYS[value - 1];
  if (!key) throw new RangeError(`Ungültige Bewertung: ${value}`);
  return key;
}
