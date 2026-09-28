/**
 * Bibliothek (Bibliothek.dc.html, iPadStapel.dc.html) und Stapel-Detail (Stapel.dc.html) als
 * reine Funktionen: Rohdaten rein, fertige Texte und Listen raus. Die Oberfläche rechnet nichts.
 */
import { cardTitle, CARD_TYPE_LABEL } from '../cards/card';
import type { Area, Card, Deck, ReviewItem } from '../model/records';
import { maturityOf } from '../scheduler/schedule';
import type { LearningSettings } from '../scheduler/settings';
import { cardCount, groupDigits } from '../today/today';
import { sortAreas } from './areas';

export const ALL_AREAS = 'ALL';

export interface LibraryInput {
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  /** Karten je Stapel-ID; fehlende Stapel haben keine. */
  readonly cardCounts: Readonly<Record<string, number>>;
  /** Heute fällige Abfragen je Stapel-ID. */
  readonly dueCounts: Readonly<Record<string, number>>;
}

export interface FilterChip {
  /** `ALL` oder die ID des Rechtsgebiets. */
  readonly id: string;
  readonly label: string;
}

export interface StackRow {
  readonly id: string;
  readonly name: string;
  /** „48 Karten“ */
  readonly meta: string;
  /** „auch ÖR“, wenn der Stapel in weiteren Rechtsgebieten liegt. */
  readonly also: string | null;
  readonly due: number;
}

export interface AreaGroup {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly stacks: readonly StackRow[];
}

export interface LibraryModel {
  readonly filters: readonly FilterChip[];
  /** Gewählter Filter; ein unbekannter fällt auf „Alle“ zurück. */
  readonly filter: string;
  readonly groups: readonly AreaGroup[];
  /** Es gibt noch keinen Stapel. */
  readonly empty: boolean;
  /** Es gibt Stapel, aber keinen im gewählten Rechtsgebiet. */
  readonly filterEmpty: boolean;
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'de');
}

export function libraryModel(input: LibraryInput, filter: string = ALL_AREAS): LibraryModel {
  const areas = sortAreas(input.areas);
  const selected = areas.some((a) => a.id === filter) ? filter : ALL_AREAS;
  const codeOf = (id: string) => areas.find((a) => a.id === id)?.code ?? '';
  const groups: AreaGroup[] = [];
  for (const area of areas) {
    if (selected !== ALL_AREAS && selected !== area.id) continue;
    const stacks = input.decks
      .filter((d) => d.areaIds.includes(area.id))
      .sort(byName)
      .map((d) => {
        const others = sortAreas(
          areas.filter((a) => a.id !== area.id && d.areaIds.includes(a.id)),
        ).map((a) => codeOf(a.id));
        return {
          id: d.id,
          name: d.name,
          meta: cardCount(input.cardCounts[d.id] ?? 0),
          also: others.length > 0 ? `auch ${others.join(', ')}` : null,
          due: input.dueCounts[d.id] ?? 0,
        };
      });
    // Rechtsgebiete ohne Stapel zeigt die Übersicht nicht; verwaltet werden sie im Stift-Sheet.
    if (stacks.length > 0) groups.push({ id: area.id, code: area.code, name: area.name, stacks });
  }
  return {
    filters: [{ id: ALL_AREAS, label: 'Alle' }, ...areas.map((a) => ({ id: a.id, label: a.code }))],
    filter: selected,
    groups,
    empty: input.decks.length === 0,
    filterEmpty: input.decks.length > 0 && groups.length === 0,
  };
}

/** Karten je Rechtsgebiet für das Verwalten-Sheet („3 Stapel“). */
export function areaDeckCounts(areas: readonly Area[], decks: readonly Deck[]) {
  return sortAreas(areas).map((a) => {
    const n = decks.filter((d) => d.areaIds.includes(a.id)).length;
    return { id: a.id, code: a.code, name: a.name, meta: `${groupDigits(n)} Stapel` };
  });
}

// ---------- Stapel-Detail ----------

export interface DeckProgress {
  readonly secure: number;
  readonly learning: number;
  readonly fresh: number;
}

/**
 * Fortschritt eines Stapels in Abfragen: neu (nie bewertet), im Lernen und sicher (Abstand ab
 * 21 Tagen, siehe `maturityOf`).
 */
export function deckProgress(
  items: readonly ReviewItem[],
  settings: LearningSettings,
): DeckProgress {
  const count = { secure: 0, learning: 0, fresh: 0 };
  for (const item of items) count[maturityOf(item, settings)] += 1;
  return count;
}

export interface BarPart {
  readonly key: 'secure' | 'learning' | 'fresh';
  readonly label: string;
  /** Breite in Prozent. */
  readonly pct: number;
}

/** Teile der Fortschrittsleiste (Stapel.dc.html: „10 sicher“, „7 im Lernen“, „4 neu“). */
export function progressBar(p: DeckProgress): BarPart[] {
  const total = p.secure + p.learning + p.fresh;
  if (total === 0) return [];
  const parts: BarPart[] = [
    { key: 'secure', label: `${groupDigits(p.secure)} sicher`, pct: (p.secure / total) * 100 },
    {
      key: 'learning',
      label: `${groupDigits(p.learning)} im Lernen`,
      pct: (p.learning / total) * 100,
    },
    { key: 'fresh', label: `${groupDigits(p.fresh)} neu`, pct: (p.fresh / total) * 100 },
  ];
  return parts;
}

export interface AreaToggle {
  readonly id: string;
  readonly name: string;
  readonly on: boolean;
  /** Letztes Rechtsgebiet des Stapels: lässt sich nicht abwählen. */
  readonly locked: boolean;
}

export interface CardRow {
  readonly id: string;
  /** „Frage“ oder „Lücke“ */
  readonly type: string;
  readonly title: string;
  readonly norm: string;
}

export interface DeckModel {
  readonly id: string;
  readonly name: string;
  readonly norm: string;
  readonly areas: readonly AreaToggle[];
  readonly bar: readonly BarPart[];
  readonly cta: {
    readonly kind: 'learn' | 'create' | 'idle';
    readonly label: string;
    readonly short: string;
  };
  /** „21 Karten“ */
  readonly cardCount: string;
  readonly cards: readonly CardRow[];
}

export function deckModel(input: {
  deck: Deck;
  areas: readonly Area[];
  cards: readonly Card[];
  progress: DeckProgress;
  /** Heute fällige Abfragen des Stapels. */
  due: number;
}): DeckModel {
  const { deck, cards, due } = input;
  const cta: DeckModel['cta'] =
    cards.length === 0
      ? { kind: 'create', label: 'Erste Karte anlegen', short: 'Erste Karte anlegen' }
      : due > 0
        ? {
            kind: 'learn',
            label: `${due} fällige ${due === 1 ? 'Karte' : 'Karten'} lernen`,
            short: `${due} fällige lernen`,
          }
        : { kind: 'idle', label: 'Heute nichts fällig', short: 'Nichts fällig' };
  return {
    id: deck.id,
    name: deck.name,
    norm: deck.norm,
    areas: sortAreas(input.areas).map((a) => ({
      id: a.id,
      name: a.name,
      on: deck.areaIds.includes(a.id),
      locked: deck.areaIds.length === 1 && deck.areaIds.includes(a.id),
    })),
    bar: progressBar(input.progress),
    cta,
    cardCount: cardCount(cards.length),
    cards: [...cards]
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      .map((c) => ({ id: c.id, type: CARD_TYPE_LABEL[c.type], title: cardTitle(c), norm: c.norm })),
  };
}

/** „Diebstahl & Betrug · SR“ bzw. „Amtshaftung · ZR, ÖR“ für die Stapel-Zeile beim Erstellen. */
export function deckLabel(deck: Deck, areas: readonly Area[]): string {
  const codes = sortAreas(areas.filter((a) => deck.areaIds.includes(a.id))).map((a) => a.code);
  return codes.length > 0 ? `${deck.name} · ${codes.join(', ')}` : deck.name;
}
