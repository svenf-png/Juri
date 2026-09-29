/**
 * Suche über Karten (Bibliothek: „Karten, Normen, Tags“). Groß- und Kleinschreibung sowie
 * Umlaute und Akzente zählen nicht („verjahrung“ findet „Verjährung“). Alle Suchwörter müssen
 * vorkommen, in beliebiger Reihenfolge.
 */
import { cardTitle, CARD_TYPE_LABEL } from '../cards/card';
import { clozePlain } from '../cards/cloze';
import type { Card, Deck } from '../model/records';

export const SEARCH_LIMIT = 200;

function foldChar(ch: string): string {
  return ch
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ß', 'ss');
}

/** Faltet Text und merkt für jedes Zeichen des Ergebnisses die Stelle im Original. */
function fold(text: string): { folded: string; origin: number[] } {
  let folded = '';
  const origin: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = foldChar(ch);
    folded += f;
    for (let k = 0; k < f.length; k++) origin.push(i);
    i += ch.length;
  }
  return { folded, origin };
}

export function searchTokens(query: string): string[] {
  return fold(query)
    .folded.split(/\s+/u)
    .filter((t) => t !== '');
}

export interface SearchHit {
  readonly id: string;
  readonly deckId: string;
  /** „Frage“ oder „Lücke“ */
  readonly type: string;
  readonly title: string;
  /** „Diebstahl & Betrug · § 242 StGB“ */
  readonly meta: string;
}

/** Alles, was die Suche an einer Karte durchsucht (bei Schemas Titel, Punkte, Normen und Inhalte, bei Abdeckungen die Herkunft). */
function body(card: Card): string {
  if (card.type === 'qa') return `${card.front}\n${card.back}`;
  if (card.type === 'cloze') return clozePlain(card.text);
  if (card.type === 'cover') return cardTitle(card);
  const points = card.points.flatMap((p) => [p.text, p.norm ?? '', p.content ?? '']);
  return [card.title, ...points].join('\n');
}

/** Ganzer Text auf einmal gefaltet (ohne Herkunftstabelle); für die Suche, nicht fürs Hervorheben. */
function foldPlain(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ß', 'ss');
}

/**
 * Gefaltete Suchtexte je Karte, solange das Kartenobjekt unverändert ist: Beim Tippen ändern sich
 * die Karten nicht, also faltet nur die erste Eingabe alle Karten, die folgenden lesen den Zwischenspeicher.
 */
const indexed = new WeakMap<
  Card,
  { title: string; hay: string; deckId: string; deckName: string }
>();

function indexOf(card: Card, deckName: string) {
  const hit = indexed.get(card);
  if (hit && hit.deckId === card.deckId && hit.deckName === deckName) return hit;
  const tags = card.tags.map((t) => `#${t}`).join(' ');
  const entry = {
    title: foldPlain(cardTitle(card)),
    hay: foldPlain(`${body(card)}\n${card.norm}\n${tags}\n${deckName}`),
    deckId: card.deckId,
    deckName,
  };
  indexed.set(card, entry);
  return entry;
}

export function searchCards(
  query: string,
  cards: readonly Card[],
  decks: readonly Deck[],
): SearchHit[] {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const deckName = new Map(decks.map((d) => [d.id, d.name]));
  const hits: { hit: SearchHit; score: number; createdAt: number }[] = [];
  for (const card of cards) {
    const name = deckName.get(card.deckId) ?? '';
    const { title, hay } = indexOf(card, name);
    if (!tokens.every((t) => hay.includes(t))) continue;
    const score = tokens.filter((t) => title.includes(t)).length;
    const extra = card.norm !== '' ? card.norm : card.tags.map((t) => `#${t}`).join(' ');
    hits.push({
      hit: {
        id: card.id,
        deckId: card.deckId,
        type: CARD_TYPE_LABEL[card.type],
        title: cardTitle(card),
        meta: extra === '' ? name : `${name} · ${extra}`,
      },
      score,
      createdAt: card.createdAt,
    });
  }
  hits.sort(
    (a, b) => b.score - a.score || b.createdAt - a.createdAt || a.hit.id.localeCompare(b.hit.id),
  );
  return hits.slice(0, SEARCH_LIMIT).map((h) => h.hit);
}

export interface HighlightPart {
  readonly text: string;
  readonly hit: boolean;
}

/** Teilt `text` an den Fundstellen der Suchwörter, für die Hervorhebung in der Trefferliste. */
export function highlight(text: string, tokens: readonly string[]): HighlightPart[] {
  const { folded, origin } = fold(text);
  const marked = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    if (token === '') continue;
    for (let at = folded.indexOf(token); at !== -1; at = folded.indexOf(token, at + 1)) {
      const start = origin[at] ?? 0;
      const last = origin[at + token.length - 1] ?? start;
      // Das letzte Zeichen kann ein Surrogatpaar sein (zwei Einheiten).
      const end = last + ((text.codePointAt(last) ?? 0) > 0xffff ? 2 : 1);
      for (let k = start; k < end; k++) marked[k] = true;
    }
  }
  const parts: HighlightPart[] = [];
  for (let k = 0; k < text.length; k++) {
    const hit = marked[k] ?? false;
    const last = parts.at(-1);
    if (last?.hit === hit) parts[parts.length - 1] = { text: last.text + text.charAt(k), hit };
    else parts.push({ text: text.charAt(k), hit });
  }
  return parts;
}
