/**
 * Karten anlegen und prüfen: aus den Eingaben des Formulars (Text in Feldern) werden geprüfte
 * Felder, aus einer Karte ihre Abfragen. Reine Funktionen.
 */
import type { Card, CardType, ReviewItem, SchemaPoint } from '../model/records';
import { clozeNumbers, clozePlain, gapSub, hasGap } from './cloze';
import { checkSchema, type DraftPoint, type SchemaErrors } from './schema';

export const CARD_TYPE_LABEL: Readonly<Record<CardType, string>> = {
  qa: 'Frage',
  cloze: 'Lücke',
  schema: 'Schema',
};

/** Höchstzahl der Tags je Karte und Grenzen der Felder (Schema in records.ts). */
export const MAX_TAGS = 20;
export const FRONT_MAX = 2000;
export const BACK_MAX = 4000;
export const TEXT_MAX = 4000;
export const NORM_MAX = 200;
export const NOTE_MAX = 2000;

export type CardContent =
  | { readonly type: 'qa'; readonly front: string; readonly back: string }
  | { readonly type: 'cloze'; readonly text: string }
  | { readonly type: 'schema'; readonly title: string; readonly points: SchemaPoint[] };

/** Eingaben des Karten-Formulars, alles Text. */
export interface CardForm {
  readonly type: CardType;
  readonly front: string;
  readonly back: string;
  /** Text mit Lücken in der Schreibweise `{{c1::Wort}}`. */
  readonly text: string;
  /** Schema: Titel und Gliederung (schema.ts). */
  readonly title?: string;
  readonly points?: readonly DraftPoint[];
  readonly norm: string;
  /** „#Klausur #AG“ oder „Klausur, AG“. */
  readonly tags: string;
  /** Eigene Notiz; erscheint beim Lernen unter der Antwort (Entscheidung 5). */
  readonly note: string;
}

export interface CardFields {
  readonly content: CardContent;
  readonly norm: string;
  readonly tags: string[];
  /** Leer, wenn es keine Notiz gibt. */
  readonly note: string;
}

export type CardErrors = Partial<Record<'front' | 'back' | 'text' | 'norm' | 'note', string>> & {
  /** Nur Schema: Fehler in Titel und Gliederung. */
  readonly schema?: SchemaErrors;
};

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

function tooLong(what: string, max: number): string {
  return `${what} ist zu lang (höchstens ${max.toLocaleString('de-DE')} Zeichen).`;
}

export function checkCard(
  form: CardForm,
): { ok: true; fields: CardFields } | { ok: false; errors: CardErrors } {
  const norm = tidyLine(form.norm, Infinity);
  const tags = normalizeTags(form.tags);
  const note = form.note.trim();
  const errors: CardErrors = {};
  if (norm.length > NORM_MAX) errors.norm = tooLong('Die Norm', NORM_MAX);
  if (note.length > NOTE_MAX) errors.note = tooLong('Die Notiz', NOTE_MAX);
  if (form.type === 'qa') {
    const front = form.front.trim();
    const back = form.back.trim();
    if (front === '') errors.front = 'Die Vorderseite fehlt.';
    else if (front.length > FRONT_MAX) errors.front = tooLong('Die Vorderseite', FRONT_MAX);
    if (back === '') errors.back = 'Die Rückseite fehlt.';
    else if (back.length > BACK_MAX) errors.back = tooLong('Die Rückseite', BACK_MAX);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return { ok: true, fields: { content: { type: 'qa', front, back }, norm, tags, note } };
  }
  if (form.type === 'schema') {
    const checked = checkSchema({ title: form.title ?? '', points: form.points ?? [] });
    if (!checked.ok) return { ok: false, errors: { ...errors, schema: checked.errors } };
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return {
      ok: true,
      fields: { content: { type: 'schema', ...checked.fields }, norm, tags, note },
    };
  }
  const text = form.text.trim();
  if (text === '') errors.text = 'Der Text fehlt.';
  else if (!hasGap(text)) errors.text = 'Markiere mindestens ein Wort als Lücke.';
  // Die Markierungen zählen mit: `{{c1::` und `}}` machen jede Lücke um acht Zeichen länger.
  else if (text.length > TEXT_MAX) errors.text = tooLong('Der Text mit den Lücken', TEXT_MAX);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, fields: { content: { type: 'cloze', text }, norm, tags, note } };
}

/** Kennungen der Abfragen einer Karte: Frage `['']`, Lückentext `['c1', 'c3']`. */
export function reviewSubs(content: CardContent): string[] {
  return content.type === 'cloze' ? clozeNumbers(content.text).map(gapSub) : [''];
}

/** Feste Kennung einer Abfrage: dieselbe Karte und Lücke ergibt immer dieselbe ID. */
export function reviewItemId(cardId: string, sub: string): string {
  return sub === '' ? cardId : `${cardId}:${sub}`;
}

/** Inhalt einer Karte ohne die gemeinsamen Felder. */
export function contentOf(card: Card): CardContent {
  if (card.type === 'schema') return { type: 'schema', title: card.title, points: card.points };
  return card.type === 'qa'
    ? { type: 'qa', front: card.front, back: card.back }
    : { type: 'cloze', text: card.text };
}

/** Einzeilige Überschrift für Listen: Vorderseite, bei Lücken der Text mit aufgedeckten Lücken. */
export function cardTitle(
  card: Pick<Card, 'type'> & Partial<Record<'front' | 'text' | 'title', string>>,
): string {
  const raw =
    card.type === 'qa'
      ? (card.front ?? '')
      : card.type === 'schema'
        ? (card.title ?? '')
        : clozePlain(card.text ?? '');
  return raw.replace(/\s+/gu, ' ').trim();
}

/**
 * Kurztext einer Karte für die Vorschau in der Verknüpfung (Schema.dc.html): die Antwort einer
 * Frage, der Text eines Lückentextes mit aufgedeckten Lücken, bei einem Schema die Punkte der
 * obersten Ebene.
 */
export function cardPreview(card: Card): string {
  if (card.type === 'qa') return card.back.trim();
  if (card.type === 'cloze') return clozePlain(card.text).trim();
  return card.points
    .filter((p) => p.level === 1)
    .map((p, i) => `${String(i + 1)}. ${p.text}`)
    .join(' · ');
}

/** Karte aus geprüften Feldern. */
export function buildCard(
  id: string,
  deckId: string,
  fields: CardFields,
  createdAt: number,
  updatedAt: number,
): Card {
  const base = {
    id,
    deckId,
    norm: fields.norm,
    tags: fields.tags,
    ...(fields.note === '' ? {} : { note: fields.note }),
    createdAt,
    updatedAt,
  };
  const { content } = fields;
  if (content.type === 'schema') {
    return { ...base, type: 'schema', title: content.title, points: content.points };
  }
  return content.type === 'qa'
    ? { ...base, type: 'qa', front: content.front, back: content.back }
    : { ...base, type: 'cloze', text: content.text };
}

/** Die Abfragen einer Karte, alle neu. */
export function buildItems(card: Card, now: number): ReviewItem[] {
  return reviewSubs(contentOf(card)).map((sub) => ({
    id: reviewItemId(card.id, sub),
    cardId: card.id,
    deckId: card.deckId,
    sub,
    createdAt: now,
  }));
}
