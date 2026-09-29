/** Bausteine für die Tests von `.juri`: kleine, gültige Karten, Stapel und Medien. */
import type { Area, Card, Deck, MediaRecord, ReviewItem } from '../model/records';
import type { JuriPackage } from './format';
import { buildPackage, type ExportSource } from './build';

export const NOW = Date.UTC(2026, 8, 29, 10, 0, 0);

export const area = (code: string, name = code): Area => ({
  id: `area-${code}`,
  code,
  name,
  createdAt: 1,
  updatedAt: 1,
});

export const deck = (id: string, name: string, areaIds = ['area-ZR']): Deck => ({
  id,
  name,
  norm: '',
  areaIds,
  createdAt: 1,
  updatedAt: 1,
});

export const qa = (id: string, deckId: string, front = `Frage ${id}`, extra = {}): Card => ({
  id,
  deckId,
  type: 'qa',
  front,
  back: `Antwort ${id}`,
  norm: '',
  tags: [],
  createdAt: 10,
  updatedAt: 10,
  ...extra,
});

export const cloze = (id: string, deckId: string, text: string): Card => ({
  id,
  deckId,
  type: 'cloze',
  text,
  norm: '',
  tags: [],
  createdAt: 10,
  updatedAt: 10,
});

export const schema = (
  id: string,
  deckId: string,
  links: (string | undefined)[],
  extra = {},
): Card => ({
  id,
  deckId,
  type: 'schema',
  title: `Schema ${id}`,
  points: links.map((link, i) => ({
    id: `p${String(i + 1)}`,
    level: 1,
    text: `Punkt ${String(i + 1)}`,
    ...(link === undefined ? {} : { link }),
  })),
  norm: '',
  tags: [],
  createdAt: 10,
  updatedAt: 10,
  ...extra,
});

export const cover = (id: string, deckId: string, mediaId: string, extra = {}): Card => ({
  id,
  deckId,
  type: 'cover',
  mediaId,
  masks: [
    { n: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    { n: 2, x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
  ],
  norm: '',
  tags: [],
  createdAt: 10,
  updatedAt: 10,
  ...extra,
});

const bytes = (head: number[], size: number): ArrayBuffer => {
  const data = new Uint8Array(size);
  data.set(head);
  return data.buffer;
};

export const image = (id: string, size = 64): MediaRecord => ({
  id,
  kind: 'image',
  mime: 'image/jpeg',
  name: `${id}.jpg`,
  size,
  width: 100,
  height: 80,
  createdAt: 5,
  data: bytes([0xff, 0xd8, 0xff, 0xe0], size),
});

export const pdf = (id: string, size = 64): MediaRecord => ({
  id,
  kind: 'pdf',
  mime: 'application/pdf',
  name: `${id}.pdf`,
  size,
  pages: 3,
  createdAt: 5,
  data: bytes([0x25, 0x50, 0x44, 0x46, 0x2d], size),
});

/** Abfragen einer Karte, als hätte sie schon Lernfortschritt. */
export const learned = (card: Card, sub = ''): ReviewItem => ({
  id: sub === '' ? card.id : `${card.id}:${sub}`,
  cardId: card.id,
  deckId: card.deckId,
  sub,
  createdAt: 10,
  due: 5000,
  lastReviewedAt: 4000,
  leitner: { box: 3, due: 5000 },
});

export const SOURCE: ExportSource = {
  decks: [deck('deck-a', 'Amtshaftung', ['area-ÖR', 'area-ZR']), deck('deck-b', 'Sachenrecht')],
  areas: [area('ZR', 'Zivilrecht'), area('ÖR', 'Öffentliches Recht')],
  cards: [
    qa('c1', 'deck-a'),
    cloze('c2', 'deck-a', 'Die {{c1::Amtshaftung}} folgt aus {{c2::§ 839 BGB}}.'),
    schema('s1', 'deck-a', ['c1', undefined]),
    cover('m1', 'deck-a', 'img1', { source: { name: 'Skript.pdf', page: 4, mediaId: 'doc1' } }),
    qa('c3', 'deck-b', 'Gutgläubiger Erwerb?', { note: 'meine Notiz' }),
    cover('m2', 'deck-b', 'img1'),
  ],
  media: [image('img1'), pdf('doc1')],
};

export function pack(
  deckIds = ['deck-a'],
  options: { notes?: boolean; source?: ExportSource } = {},
): JuriPackage {
  return buildPackage(options.source ?? SOURCE, {
    deckIds,
    notes: options.notes ?? false,
    achievements: null,
    senderName: 'Mara',
    now: NOW,
    appVersion: '0.11.0',
  }).pack;
}

/** Zähler statt Zufall: `n1`, `n2` … */
export function counter(prefix = 'n'): () => string {
  let n = 0;
  return () => `${prefix}${String(++n)}`;
}

import type { MergeLocal, MergePlan } from './merge';

/** Lokaler Bestand nach dem Ausführen eines Plans (nur für Tests). */
export function applied(local: MergeLocal, plan: MergePlan): MergeLocal {
  const w = plan.writes;
  const cards = new Map(local.cards.map((c) => [c.id, c]));
  for (const c of w.cards) cards.set(c.id, c);
  const gone = new Set(w.itemsDelete);
  const decks = new Map(local.decks.map((d) => [d.id, d]));
  for (const d of w.decks) decks.set(d.id, d);
  const media = new Map(local.media.map((m) => [m.id, m]));
  for (const m of w.media) media.set(m.id, { id: m.id, kind: m.kind, size: m.size });
  const known = new Set(local.knownCardIds);
  for (const e of w.events) if (e.type === 'cardImported') known.add(e.cardId);
  return {
    decks: [...decks.values()],
    areas: [...local.areas, ...w.areas],
    cards: [...cards.values()],
    items: [...local.items.filter((i) => !gone.has(i.id)), ...w.itemsAdd],
    media: [...media.values()],
    knownCardIds: known,
  };
}

export const EMPTY_LOCAL: MergeLocal = {
  decks: [],
  areas: [],
  cards: [],
  items: [],
  media: [],
  knownCardIds: new Set(),
};
