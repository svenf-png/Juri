/**
 * Stapel für den Export zusammenstellen (ADR-014): Karten ohne Lernfortschritt, Notizen nur mit
 * Schalter (Entscheidung 5), Verknüpfungen nur innerhalb der Auswahl, Medien nur die genutzten.
 * Rein: Lokale Daten kommen als Parameter, die Uhr ebenfalls.
 */
import { mediaIdsOf } from '../cards/card';
import { withoutLinks } from '../cards/schema';
import { omit } from './omit';
import type { Area, Card, Deck, MediaRecord } from '../model/records';
import {
  GREETING_EXTENSION,
  GREETING_FORMAT,
  JURI_EXTENSION,
  JURI_FORMAT,
  JURI_FORMAT_VERSION,
  MAX_HIGH_FIVES_PER_FILE,
  type Achievements,
  type GreetingManifest,
  type HighFive,
  type JuriPackage,
  type PackDeck,
  type PackMedia,
} from './format';

export interface ExportSource {
  readonly decks: readonly Deck[];
  readonly areas: readonly Area[];
  readonly cards: readonly Card[];
  readonly media: readonly MediaRecord[];
}

export interface ExportOptions {
  /** Zu teilende Stapel in der Reihenfolge der Datei. */
  readonly deckIds: readonly string[];
  /** Eigene Notizen mitschicken (Entscheidung 5). */
  readonly notes: boolean;
  /** Erfolgs-Snapshot; `null`, wenn er nicht mitreisen soll (A9). */
  readonly achievements: Achievements | null;
  readonly highFives?: readonly HighFive[];
  readonly senderName?: string | undefined;
  /** Absender-ID dieses Profils (M11); ohne sie entsteht beim Empfänger kein Kontakt. */
  readonly senderId?: string | undefined;
  readonly now: number;
  readonly appVersion: string;
}

export interface ExportResult {
  readonly pack: JuriPackage;
  /** Karten, die nicht in die Datei kamen (Abdeckung ohne Bild). */
  readonly skipped: number;
  /** Verknüpfungen zu Karten außerhalb der Auswahl, die wegfielen. */
  readonly linksDropped: number;
  /** Ids der exportierten Karten, die den Karten-Hash als gemeinsamen Stand bekommen. */
  readonly cardIds: readonly string[];
}

const byCreated = (a: Card, b: Card) =>
  a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildPackage(source: ExportSource, options: ExportOptions): ExportResult {
  const decks = options.deckIds
    .map((id) => source.decks.find((d) => d.id === id))
    .filter((d): d is Deck => d !== undefined);
  if (decks.length === 0) throw new RangeError('Kein Stapel gewählt.');
  const areaById = new Map(source.areas.map((a) => [a.id, a]));
  const mediaById = new Map(source.media.map((m) => [m.id, m]));
  const inSelection = new Set(decks.map((d) => d.id));

  let skipped = 0;
  const picked: Card[] = [];
  for (const deckId of inSelection) {
    for (const card of source.cards.filter((c) => c.deckId === deckId).sort(byCreated)) {
      // Eine Abdeckung ohne Bild (Lücke im Backup) taugt nicht für die Datei.
      if (card.type === 'cover' && !mediaById.has(card.mediaId)) {
        skipped += 1;
        continue;
      }
      picked.push(card);
    }
  }
  const ids = new Set(picked.map((c) => c.id));

  let linksDropped = 0;
  const cards: Card[] = picked.map((card) => {
    const note = card.note;
    let out = omit(card, 'originHash', 'note');
    if (options.notes && note !== undefined) out = { ...out, note };
    // Ein gespeichertes PDF, das fehlt, lässt den Namen und die Seite stehen.
    if (out.source?.mediaId !== undefined && !mediaById.has(out.source.mediaId)) {
      out = { ...out, source: omit(out.source, 'mediaId') };
    }
    if (out.type === 'schema') {
      const outside = new Set(
        out.points.map((p) => p.link).filter((l): l is string => l !== undefined && !ids.has(l)),
      );
      const unlinked = withoutLinks(out, outside);
      if (unlinked) {
        linksDropped += out.points.filter(
          (p) => p.link !== undefined && outside.has(p.link),
        ).length;
        out = unlinked;
      }
    }
    return out;
  });

  const usedMedia = new Set(cards.flatMap(mediaIdsOf));
  const media: PackMedia[] = source.media
    .filter((m) => usedMedia.has(m.id))
    .map((m) => omit(m, 'createdAt'))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const packDecks: PackDeck[] = decks.map((deck) => {
    const areas = deck.areaIds
      .map((id) => areaById.get(id))
      .filter((a): a is Area => a !== undefined)
      .map((a) => ({ code: a.code, name: a.name }));
    return {
      id: deck.id,
      name: deck.name,
      norm: deck.norm,
      areas: areas.length > 0 ? areas : [{ code: 'SO', name: 'Sonstiges' }],
      createdAt: deck.createdAt,
    };
  });

  const pack: JuriPackage = {
    manifest: {
      format: JURI_FORMAT,
      formatVersion: JURI_FORMAT_VERSION,
      createdAt: options.now,
      app: { version: options.appVersion },
      ...(options.senderName
        ? {
            sender: {
              name: options.senderName,
              ...(options.senderId ? { id: options.senderId } : {}),
            },
          }
        : {}),
      notes: options.notes,
      decks: decks.map((d) => ({
        id: d.id,
        name: d.name,
        cards: cards.filter((c) => c.deckId === d.id).length,
      })),
      counts: { cards: cards.length, media: media.length },
      ...(options.achievements ? { achievements: options.achievements } : {}),
      ...(options.achievements && options.highFives && options.highFives.length > 0
        ? { highFives: [...options.highFives] }
        : {}),
    },
    decks: packDecks,
    cards,
    media,
  };
  return { pack, skipped, linksDropped, cardIds: cards.map((c) => c.id) };
}

export interface GreetingOptions {
  readonly senderId: string;
  readonly senderName: string;
  /** Erfolgs-Snapshot; `null`, wenn er nicht mitreisen soll (A9). */
  readonly achievements: Achievements | null;
  readonly highFives: readonly HighFive[];
  readonly now: number;
  readonly appVersion: string;
}

/** Manifest einer Gruß-Datei (M11): Absender mit ID, High fives, optional der Erfolgs-Snapshot. */
export function buildGreeting(options: GreetingOptions): GreetingManifest {
  if (options.highFives.length === 0) throw new RangeError('Kein High five.');
  return {
    format: GREETING_FORMAT,
    formatVersion: JURI_FORMAT_VERSION,
    createdAt: options.now,
    app: { version: options.appVersion },
    sender: { name: options.senderName, id: options.senderId },
    ...(options.achievements ? { achievements: options.achievements } : {}),
    highFives: options.highFives.slice(0, MAX_HIGH_FIVES_PER_FILE),
  };
}

/** Dateiname der Gruß-Datei: „High five von Sven.juri-gruss“. */
export function greetingFileName(senderName: string): string {
  const clean = senderName
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 40)
    .trim();
  return `High five${clean ? ` von ${clean}` : ''}${GREETING_EXTENSION}`;
}

/** Dateiname: ein Stapel heißt wie er, mehrere tragen das Datum der Gerätezeitzone. */
export function juriFileName(deckNames: readonly string[], now: number): string {
  if (deckNames.length === 1) {
    const clean = (deckNames[0] ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 60)
      .trim();
    if (clean !== '' && clean !== '.' && clean !== '..') return `${clean}${JURI_EXTENSION}`;
  }
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Juri-Stapel-${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${JURI_EXTENSION}`;
}
