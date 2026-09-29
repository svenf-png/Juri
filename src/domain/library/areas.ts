/**
 * Rechtsgebiete (ZR, SR, ÖR, eigene): Reihenfolge, Prüfung der Eingaben, Löschregel.
 * Ein Rechtsgebiet ist ein Etikett, das Stapel gruppiert; Stapel liegen in mindestens einem.
 */
import { AREA_CODE, type Area, type Deck } from '../model/records';
import { tidyLine } from '../cards/card';

export const AREA_NAME_MAX = 60;
export const AREA_CODE_MAX = 4;

export interface AreaSuggestion {
  readonly code: string;
  readonly name: string;
}

/** Die üblichen Rechtsgebiete, als Vorschläge beim Anlegen. Sie stehen immer vorn. */
export const AREA_SUGGESTIONS: readonly AreaSuggestion[] = [
  { code: 'ZR', name: 'Zivilrecht' },
  { code: 'SR', name: 'Strafrecht' },
  { code: 'ÖR', name: 'Öffentliches Recht' },
];

const STANDARD_ORDER = AREA_SUGGESTIONS.map((a) => a.code);

/** Zivilrecht, Strafrecht, Öffentliches Recht, danach eigene in der Reihenfolge des Anlegens. */
export function sortAreas<T extends Pick<Area, 'code' | 'createdAt' | 'id'>>(
  areas: readonly T[],
): T[] {
  const rank = (a: T) => {
    const i = STANDARD_ORDER.indexOf(a.code);
    return i === -1 ? STANDARD_ORDER.length : i;
  };
  return [...areas].sort(
    (a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

/** Kürzel aus freier Eingabe: Großbuchstaben, ohne Leerraum. Die Länge prüft `checkArea`. */
export function normalizeAreaCode(input: string): string {
  return input.replace(/\s+/gu, '').toLocaleUpperCase('de-DE');
}

export type AreaErrors = Partial<Record<'code' | 'name', string>>;

/** Prüft Kürzel und Name; `others` sind die übrigen Rechtsgebiete (ohne das bearbeitete). */
export function checkArea(
  input: { code: string; name: string },
  others: readonly Pick<Area, 'code' | 'name'>[],
): { ok: true; code: string; name: string } | { ok: false; errors: AreaErrors } {
  const code = normalizeAreaCode(input.code);
  const name = tidyLine(input.name, Infinity);
  const errors: AreaErrors = {};
  if (!AREA_CODE.test(code)) errors.code = 'Zwei bis vier Zeichen, Buchstaben oder Ziffern.';
  else if (others.some((a) => a.code === code)) errors.code = 'Dieses Kürzel gibt es schon.';
  if (name === '') errors.name = 'Der Name fehlt.';
  else if (name.length > AREA_NAME_MAX) {
    errors.name = `Der Name ist zu lang (höchstens ${AREA_NAME_MAX} Zeichen).`;
  } else if (
    others.some((a) => a.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))
  ) {
    errors.name = 'Dieses Rechtsgebiet gibt es schon.';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, code, name };
}

/** Vorschläge, die es noch nicht gibt. */
export function missingSuggestions(areas: readonly Pick<Area, 'code'>[]): AreaSuggestion[] {
  return AREA_SUGGESTIONS.filter((s) => !areas.some((a) => a.code === s.code));
}

/**
 * Löschregel: Ein Stapel darf nie ohne Rechtsgebiet dastehen. Liegen Stapel nur in diesem
 * Rechtsgebiet, sind sie das Hindernis; alle anderen verlieren nur die Zuordnung.
 */
export function areaDeletion(
  areaId: string,
  decks: readonly Deck[],
): { ok: true; alsoElsewhere: Deck[] } | { ok: false; blockedBy: Deck[] } {
  const inArea = decks.filter((d) => d.areaIds.includes(areaId));
  const blockedBy = inArea.filter((d) => d.areaIds.length === 1);
  if (blockedBy.length > 0) return { ok: false, blockedBy };
  return { ok: true, alsoElsewhere: inArea };
}
