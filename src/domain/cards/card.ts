/**
 * Karten anlegen und prüfen: aus den Eingaben des Formulars (Text in Feldern) werden geprüfte
 * Felder, aus einer Karte ihre Abfragen. Reine Funktionen.
 */
import type { Card, CardType } from '../model/records';
import { clozeNumbers, clozePlain, gapSub, hasGap } from './cloze';

export const CARD_TYPE_LABEL: Readonly<Record<CardType, string>> = { qa: 'Frage', cloze: 'Lücke' };

/** Höchstzahl der Tags je Karte (Schema in records.ts). */
export const MAX_TAGS = 20;

export type CardContent =
  | { readonly type: 'qa'; readonly front: string; readonly back: string }
  | { readonly type: 'cloze'; readonly text: string };

/** Eingaben des Karten-Formulars, alles Text. */
export interface CardForm {
  readonly type: CardType;
  readonly front: string;
  readonly back: string;
  /** Text mit Lücken in der Schreibweise `{{c1::Wort}}`. */
  readonly text: string;
  readonly norm: string;
  /** „#Klausur #AG“ oder „Klausur, AG“. */
  readonly tags: string;
}

export interface CardFields {
  readonly content: CardContent;
  readonly norm: string;
  readonly tags: string[];
}

export type CardErrors = Partial<Record<'front' | 'back' | 'text', string>>;

/** Tags aus freier Eingabe: getrennt durch Leerraum oder Komma, ohne „#“, ohne Doppelte. */
export function normalizeTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of input.split(/[\s,]+/u)) {
    const tag = part.replace(/^#+/u, '').replace(/#+$/u, '').slice(0, 40);
    const key = tag.toLocaleLowerCase('de-DE');
    if (tag === '' || tag.includes('#') || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

/** Tags für das Eingabefeld: `['Klausur', 'AG']` → „#Klausur #AG“. */
export function formatTags(tags: readonly string[]): string {
  return tags.map((t) => `#${t}`).join(' ');
}

/** Einzeiliger Text ohne Leerraum am Rand und ohne Mehrfach-Leerzeichen. */
export function tidyLine(input: string, max: number): string {
  return input.replace(/\s+/gu, ' ').trim().slice(0, max).trim();
}

export function checkCard(
  form: CardForm,
): { ok: true; fields: CardFields } | { ok: false; errors: CardErrors } {
  const norm = tidyLine(form.norm, 200);
  const tags = normalizeTags(form.tags);
  if (form.type === 'qa') {
    const front = form.front.trim();
    const back = form.back.trim();
    const errors: CardErrors = {};
    if (front === '') errors.front = 'Die Vorderseite fehlt.';
    if (back === '') errors.back = 'Die Rückseite fehlt.';
    if (errors.front || errors.back) return { ok: false, errors };
    return { ok: true, fields: { content: { type: 'qa', front, back }, norm, tags } };
  }
  const text = form.text.trim();
  if (text === '') return { ok: false, errors: { text: 'Der Text fehlt.' } };
  if (!hasGap(text))
    return { ok: false, errors: { text: 'Markiere mindestens ein Wort als Lücke.' } };
  return { ok: true, fields: { content: { type: 'cloze', text }, norm, tags } };
}

/** Kennungen der Abfragen einer Karte: Frage `['']`, Lückentext `['c1', 'c3']`. */
export function reviewSubs(content: CardContent): string[] {
  return content.type === 'qa' ? [''] : clozeNumbers(content.text).map(gapSub);
}

/** Feste Kennung einer Abfrage: dieselbe Karte und Lücke ergibt immer dieselbe ID. */
export function reviewItemId(cardId: string, sub: string): string {
  return sub === '' ? cardId : `${cardId}:${sub}`;
}

/** Inhalt einer Karte ohne die gemeinsamen Felder. */
export function contentOf(card: Card): CardContent {
  return card.type === 'qa'
    ? { type: 'qa', front: card.front, back: card.back }
    : { type: 'cloze', text: card.text };
}

/** Einzeilige Überschrift für Listen: Vorderseite, bei Lücken der Text mit aufgedeckten Lücken. */
export function cardTitle(
  card: Pick<Card, 'type'> & Partial<Record<'front' | 'text', string>>,
): string {
  const raw = card.type === 'qa' ? (card.front ?? '') : clozePlain(card.text ?? '');
  return raw.replace(/\s+/gu, ' ').trim();
}

/** Aus einer gespeicherten Karte die Formularwerte (Bearbeiten). */
export function formFromCard(card: Card): CardForm {
  return {
    type: card.type,
    front: card.type === 'qa' ? card.front : '',
    back: card.type === 'qa' ? card.back : '',
    text: card.type === 'cloze' ? card.text : '',
    norm: card.norm,
    tags: formatTags(card.tags),
  };
}
