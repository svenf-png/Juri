/** Regeln für Stapel: Eingaben prüfen, Rechtsgebiete umschalten. */
import type { Deck } from '../model/records';
import { tidyLine } from '../cards/card';

export const DECK_NAME_MAX = 80;
export const DECK_NORM_MAX = 200;

export type DeckErrors = Partial<Record<'name' | 'areas', string>>;

/** Prüft Name, Normen und Rechtsgebiete; `others` sind die übrigen Stapel (ohne den bearbeiteten). */
export function checkDeck(
  input: { name: string; norm: string; areaIds: readonly string[] },
  others: readonly Pick<Deck, 'name'>[],
): { ok: true; name: string; norm: string; areaIds: string[] } | { ok: false; errors: DeckErrors } {
  const name = tidyLine(input.name, DECK_NAME_MAX);
  const norm = tidyLine(input.norm, DECK_NORM_MAX);
  const errors: DeckErrors = {};
  if (name === '') errors.name = 'Der Name fehlt.';
  else if (
    others.some((d) => d.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))
  ) {
    errors.name = 'Diesen Stapel gibt es schon.';
  }
  if (input.areaIds.length === 0) errors.areas = 'Wähle mindestens ein Rechtsgebiet.';
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, name, norm, areaIds: [...new Set(input.areaIds)] };
}

/**
 * Schaltet ein Rechtsgebiet um. Das letzte lässt sich nicht abwählen (`null`), damit kein Stapel
 * aus der Übersicht fällt.
 */
export function toggleArea(areaIds: readonly string[], areaId: string): string[] | null {
  if (!areaIds.includes(areaId)) return [...areaIds, areaId];
  if (areaIds.length === 1) return null;
  return areaIds.filter((id) => id !== areaId);
}
