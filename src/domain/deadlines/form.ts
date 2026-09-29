/**
 * Eingaben der Frist prüfen (Sheet „Neue Frist“ und „Frist bearbeiten“): Name, Datum, Umfang.
 * Die Fehlertexte stehen unter den Feldern (FristFehler.dc.html).
 */
import { daysBetween, parseDayKey, type Day } from '../calendar/day';
import { tidyLine } from '../cards/card';
import type { Deadline, DeadlineKind, DeadlineScope } from '../model/records';
import { isEmptyScope } from './scope';

export const DEADLINE_NAME_MAX = 60;

export interface DeadlineDraft {
  readonly kind: DeadlineKind;
  readonly name: string;
  /** „JJJJ-MM-TT“ oder leer (ohne Datum). */
  readonly date: string;
  readonly scope: DeadlineScope;
  readonly sprint: boolean;
}

export interface DraftErrors {
  readonly name?: string;
  readonly date?: string;
  readonly scope?: string;
}

export type DraftResult =
  | { readonly ok: true; readonly value: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'> }
  | { readonly ok: false; readonly errors: DraftErrors };

export const KIND_LABELS: Readonly<Record<DeadlineKind, string>> = {
  exam: 'Examen',
  klausur: 'Klausur',
  llm: 'LL.M.',
  custom: 'Eigene',
};

/** Reihenfolge der Auswahl wie in Fristen.dc.html. */
export const KIND_ORDER: readonly DeadlineKind[] = ['exam', 'klausur', 'llm', 'custom'];

/** Entwurf einer neuen Frist: Klausur, alle Karten, Endspurt an (Fristen.dc.html). */
export function newDraft(): DeadlineDraft {
  return {
    kind: 'klausur',
    name: '',
    date: '',
    scope: { all: true, areaIds: [], deckIds: [], tags: [] },
    sprint: true,
  };
}

export function draftOf(deadline: Deadline): DeadlineDraft {
  return {
    kind: deadline.kind,
    name: deadline.name,
    date: deadline.date ?? '',
    scope: deadline.scope,
    sprint: deadline.sprint,
  };
}

/**
 * Prüft den Entwurf. Ein Datum in der Vergangenheit ist nur erlaubt, wenn es unverändert von
 * einer bestehenden Frist stammt (`keepDate`), damit sich eine abgelaufene Frist umbenennen lässt.
 */
export function checkDraft(draft: DeadlineDraft, today: Day, keepDate?: string): DraftResult {
  const name = tidyLine(draft.name, DEADLINE_NAME_MAX + 1);
  const errors: { name?: string; date?: string; scope?: string } = {};
  if (name === '') errors.name = 'Gib der Frist einen Namen.';
  else if (name.length > DEADLINE_NAME_MAX) {
    errors.name = `Der Name ist zu lang (höchstens ${String(DEADLINE_NAME_MAX)} Zeichen).`;
  }
  if (draft.date !== '' && draft.date !== keepDate) {
    try {
      if (daysBetween(today, parseDayKey(draft.date)) < 0) {
        errors.date = 'Das Datum liegt in der Vergangenheit.';
      }
    } catch {
      errors.date = 'Das ist kein gültiges Datum.';
    }
  }
  if (isEmptyScope(draft.scope))
    errors.scope = 'Wähle mindestens ein Rechtsgebiet, einen Stapel oder einen Tag.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind: draft.kind,
      name,
      ...(draft.date === '' ? {} : { date: draft.date }),
      scope: draft.scope,
      sprint: draft.sprint,
    },
  };
}

/** Schaltet einen Eintrag im Umfang um; „Alle Karten“ und die Auswahl schließen sich aus. */
export function toggleScope(
  scope: DeadlineScope,
  field: 'areaIds' | 'deckIds' | 'tags',
  value: string,
): DeadlineScope {
  const has = scope[field].includes(value);
  return {
    ...scope,
    all: false,
    [field]: has ? scope[field].filter((v) => v !== value) : [...scope[field], value],
  };
}

/** „Alle Karten“ wählen leert die Auswahl. */
export function selectAll(): DeadlineScope {
  return { all: true, areaIds: [], deckIds: [], tags: [] };
}

/** Tag aus freier Eingabe: ohne „#“ und Leerraum; leer, wenn nichts übrig bleibt. */
export function normalizeTag(input: string): string {
  return input
    .replace(/^#+/u, '')
    .replace(/[\s#,]+/gu, '')
    .slice(0, 40);
}
