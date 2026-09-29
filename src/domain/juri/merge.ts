/**
 * Merge einer `.juri`-Datei in den lokalen Bestand (ADR-014), als reine Funktion: Der Plan sagt,
 * was geschrieben wird, und nennt Konflikte; ausgeführt wird er von der Datenschicht in einer
 * Transaktion. Uhr und Zufall kommen als Parameter.
 *
 * „Aktualisieren“ gleicht über die stabilen IDs (`deck.id`, `card.id`) ab und lässt jeden
 * Lernfortschritt unberührt. „Als Kopie“ vergibt für alles neue IDs und baut Verknüpfungen,
 * Abfragen und Medienverweise konsistent um.
 */
import { buildItems, cardTitle, mediaIdsOf } from '../cards/card';
import { withoutLinks } from '../cards/schema';
import type { Area, Card, Deck, MediaRecord, NewEvent, ReviewItem } from '../model/records';
import { contentHash } from './hash';
import { omit } from './omit';
import type { JuriPackage } from './format';

export type MergeMode = 'update' | 'copy';
export type Resolution = 'mine' | 'theirs';
/** `changed`: lokal und in der Datei geändert; `deleted`: lokal gelöscht, in der Datei vorhanden. */
export type ConflictKind = 'changed' | 'deleted';

export interface Conflict {
  readonly cardId: string;
  readonly deckId: string;
  readonly deckName: string;
  readonly title: string;
  readonly kind: ConflictKind;
  /** Wie der Plan den Konflikt gerade auflöst; ohne Entscheidung gilt „mine“. */
  readonly resolution: Resolution;
}

/** Was die Datenschicht lokal gefunden hat; nur, was für den Abgleich nötig ist. */
export interface MergeLocal {
  /** Alle Stapel (Namen müssen eindeutig bleiben). */
  readonly decks: readonly Deck[];
  readonly areas: readonly Area[];
  /** Karten mit einer ID aus der Datei und alle Karten der Stapel aus der Datei. */
  readonly cards: readonly Card[];
  /** Abfragen dieser Karten. */
  readonly items: readonly ReviewItem[];
  /** Medien mit einer ID aus der Datei (Art und Größe genügen). */
  readonly media: readonly Pick<MediaRecord, 'id' | 'kind' | 'size'>[];
  /** Karten-IDs aus der Datei, die lokal schon einmal da waren (Ereignis-Log). */
  readonly knownCardIds: ReadonlySet<string>;
}

export interface MergeSummary {
  readonly decksNew: number;
  readonly decksKnown: number;
  readonly cardsNew: number;
  readonly cardsUpdated: number;
  readonly cardsUnchanged: number;
  /** Konflikt „geändert“, gelöst zugunsten der eigenen Karte. */
  readonly cardsKeptMine: number;
  /** Lokal gelöschte Karten, die gelöscht bleiben. */
  readonly cardsStayDeleted: number;
  /** Karten, die aus einem früheren Import stammen und in der Datei fehlen; sie bleiben bei dir. */
  readonly cardsMissingInFile: number;
  readonly mediaNew: number;
  readonly linksDropped: number;
}

export interface MergeWrites {
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  readonly media: readonly MediaRecord[];
  readonly cards: readonly Card[];
  readonly itemsAdd: readonly ReviewItem[];
  readonly itemsDelete: readonly string[];
  readonly events: readonly NewEvent[];
  /** Karten, die neu dazukommen (Zähler der Backup-Erinnerung). */
  readonly newCards: number;
  /** Medien, die nach dem Schreiben verwaist sein können (alte Verweise aktualisierter Karten). */
  readonly releaseMedia: readonly string[];
}

export interface MergePlan {
  readonly mode: MergeMode;
  readonly conflicts: readonly Conflict[];
  readonly summary: MergeSummary;
  /** Nichts zu tun: keine neuen oder geänderten Karten und Stapel und keine Konflikte. */
  readonly empty: boolean;
  readonly writes: MergeWrites;
}

export interface MergeInput {
  readonly pack: JuriPackage;
  readonly local: MergeLocal;
  readonly mode: MergeMode;
  /** Entscheidungen je Karte; fehlt eine, gilt „mine“. */
  readonly decisions?: ReadonlyMap<string, Resolution>;
  readonly now: number;
  readonly newId: () => string;
}

const NAME_MAX = 80;
const key = (name: string) => name.toLocaleLowerCase('de-DE');

/** „Name (Kopie)“, „Name (Kopie 2)“ … bis kein Stapel so heißt (ohne Groß- und Kleinschreibung). */
export function uniqueName(name: string, taken: ReadonlySet<string>, word: string): string {
  const build = (n: number) => {
    const suffix = ` (${word}${n > 1 ? ` ${String(n)}` : ''})`;
    return `${name.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`;
  };
  let n = 1;
  while (taken.has(key(build(n)))) n += 1;
  return build(n);
}

/** Neue Abfragen und wegfallende Abfragen einer geänderten Karte; bestehende bleiben unangetastet. */
function reconcileItems(
  card: Card,
  have: readonly ReviewItem[],
  now: number,
): { add: ReviewItem[]; remove: string[] } {
  const want = buildItems(card, now);
  const wanted = new Set(want.map((w) => w.id));
  const existing = new Set(have.map((h) => h.id));
  return {
    add: want.filter((w) => !existing.has(w.id)),
    remove: have.filter((h) => !wanted.has(h.id)).map((h) => h.id),
  };
}

type Action =
  | { kind: 'new'; card: Card }
  | { kind: 'restore'; card: Card }
  | { kind: 'update'; card: Card; local: Card }
  /** Karte bleibt, `base` wird als gemeinsamer Stand vermerkt (nur wenn `record`). */
  | { kind: 'keep'; local: Card; base: string; record: boolean; changed: boolean }
  | { kind: 'unchanged'; local: Card; base: string }
  | { kind: 'skip' };

export function planMerge(input: MergeInput): MergePlan {
  const { pack, local, mode, now, newId } = input;
  const decisions = input.decisions ?? new Map<string, Resolution>();
  const copy = mode === 'copy';

  const localCards = new Map(local.cards.map((c) => [c.id, c]));
  const localDecks = new Map(local.decks.map((d) => [d.id, d]));
  const itemsByCard = new Map<string, ReviewItem[]>();
  for (const item of local.items) {
    const list = itemsByCard.get(item.cardId) ?? [];
    list.push(item);
    itemsByCard.set(item.cardId, list);
  }
  const taken = new Set(local.decks.map((d) => key(d.name)));

  // Rechtsgebiete: gleiches Kürzel = gleiches Gebiet, sonst entsteht es neu.
  const areasByCode = new Map(local.areas.map((a) => [a.code, a]));
  const newAreas: Area[] = [];
  const areaFor = (code: string, name: string): string => {
    let area = areasByCode.get(code);
    if (!area) {
      area = { id: newId(), code, name, createdAt: now, updatedAt: now };
      areasByCode.set(code, area);
      newAreas.push(area);
    }
    return area.id;
  };

  // Medien: dasselbe Bild oder PDF (gleiche ID, Art und Größe) wird wiederverwendet.
  const localMedia = new Map(local.media.map((m) => [m.id, m]));
  const mediaMap = new Map<string, string>();
  const newMedia: MediaRecord[] = [];
  for (const m of pack.media) {
    const have = localMedia.get(m.id);
    const reuse = !copy && have !== undefined && have.kind === m.kind && have.size === m.size;
    const id = reuse ? m.id : copy || have !== undefined ? newId() : m.id;
    mediaMap.set(m.id, id);
    if (!reuse) newMedia.push({ ...m, id, createdAt: now });
  }
  const remapMedia = (card: Card): Card => {
    let out: Card = card;
    if (out.type === 'cover') out = { ...out, mediaId: mediaMap.get(out.mediaId) ?? out.mediaId };
    if (out.source?.mediaId !== undefined) {
      out = {
        ...out,
        source: { ...out.source, mediaId: mediaMap.get(out.source.mediaId) ?? out.source.mediaId },
      };
    }
    return out;
  };

  // Stapel.
  const deckMap = new Map<string, string>();
  const writeDecks: Deck[] = [];
  let decksNew = 0;
  let decksKnown = 0;
  for (const d of pack.decks) {
    const existing = copy ? undefined : localDecks.get(d.id);
    if (existing) {
      deckMap.set(d.id, existing.id);
      decksKnown += 1;
      continue;
    }
    const id = copy ? newId() : d.id;
    const name = taken.has(key(d.name))
      ? uniqueName(d.name, taken, copy ? 'Kopie' : 'importiert')
      : d.name;
    taken.add(key(name));
    deckMap.set(d.id, id);
    decksNew += 1;
    const areaIds = [...new Set(d.areas.map((a) => areaFor(a.code, a.name)))];
    writeDecks.push({ id, name, norm: d.norm, areaIds, createdAt: now, updatedAt: now });
  }
  const deckName = (packDeckId: string) => {
    const id = deckMap.get(packDeckId);
    return writeDecks.find((d) => d.id === id)?.name ?? localDecks.get(id ?? '')?.name ?? '';
  };

  // Phase 1: Was geschieht mit jeder Karte der Datei?
  const cardMap = new Map<string, string>();
  const actions = new Map<string, Action>();
  const conflicts: Conflict[] = [];
  for (const original of pack.cards) {
    const incoming = remapMedia(original);
    const deckId = deckMap.get(incoming.deckId) ?? incoming.deckId;
    if (copy) {
      const id = newId();
      cardMap.set(incoming.id, id);
      const rest = omit(incoming, 'originHash');
      actions.set(incoming.id, {
        kind: 'new',
        card: { ...rest, id, deckId, createdAt: now, updatedAt: now },
      });
      continue;
    }
    cardMap.set(incoming.id, incoming.id);
    const mine = localCards.get(incoming.id);
    const theirs = contentHash(incoming);
    const conflict = (kind: ConflictKind): Resolution => {
      const resolution = decisions.get(incoming.id) ?? 'mine';
      conflicts.push({
        cardId: incoming.id,
        deckId,
        deckName: deckName(incoming.deckId),
        title: cardTitle(incoming),
        kind,
        resolution,
      });
      return resolution;
    };
    const fresh = (kind: 'new' | 'restore'): Action => ({
      kind,
      card: {
        ...incoming,
        deckId,
        createdAt: now,
        updatedAt: now,
        originHash: theirs,
      },
    });
    if (!mine) {
      const decksExisted = localDecks.has(incoming.deckId);
      if (decksExisted && local.knownCardIds.has(incoming.id)) {
        actions.set(
          incoming.id,
          conflict('deleted') === 'theirs' ? fresh('restore') : { kind: 'skip' },
        );
      } else {
        actions.set(incoming.id, fresh('new'));
      }
      continue;
    }
    const ours = contentHash(mine);
    if (ours === theirs) {
      actions.set(incoming.id, { kind: 'unchanged', local: mine, base: theirs });
      continue;
    }
    const base = mine.originHash;
    const mineChanged = base === undefined || ours !== base;
    const theirsChanged = base === undefined || theirs !== base;
    const take = (): Action => ({
      kind: 'update',
      local: mine,
      card: {
        ...incoming,
        deckId: mine.deckId,
        createdAt: mine.createdAt,
        updatedAt: now,
        originHash: theirs,
        // Die eigene Notiz bleibt, eine mitgeschickte kommt nur dazu, wenn es keine gibt.
        ...noteOf(mine.note ?? incoming.note),
      } as Card,
    });
    if (!mineChanged) actions.set(incoming.id, take());
    else if (!theirsChanged) {
      actions.set(incoming.id, {
        kind: 'keep',
        local: mine,
        base: theirs,
        record: false,
        changed: false,
      });
    } else {
      actions.set(
        incoming.id,
        conflict('changed') === 'theirs'
          ? take()
          : { kind: 'keep', local: mine, base: theirs, record: true, changed: true },
      );
    }
  }

  // Phase 2: Verknüpfungen nur zu Karten, die es danach gibt; eigene Verknüpfungen bleiben.
  const present = new Set<string>();
  for (const [packId, action] of actions) {
    if (action.kind !== 'skip') present.add(cardMap.get(packId) ?? packId);
  }
  let linksDropped = 0;
  const relink = (card: Card, mine?: Card): Card => {
    if (card.type !== 'schema') return card;
    let out: Card & { type: 'schema' } = card;
    if (mine?.type === 'schema') {
      const before = new Map(mine.points.map((p) => [p.id, p.link]));
      out = {
        ...out,
        points: out.points.map((p) => {
          const own = before.get(p.id);
          return p.link === undefined &&
            own !== undefined &&
            (present.has(own) || localCards.has(own))
            ? { ...p, link: own }
            : p;
        }),
      };
    }
    const dangling = new Set(
      out.points
        .map((p) => p.link)
        .filter((l): l is string => l !== undefined && !present.has(l) && !localCards.has(l)),
    );
    const cut = withoutLinks(out, dangling);
    if (cut) {
      linksDropped += out.points.filter((p) => p.link !== undefined && dangling.has(p.link)).length;
      return cut;
    }
    return out;
  };
  const relinkCopy = (card: Card): Card => {
    if (card.type !== 'schema') return card;
    return {
      ...card,
      points: card.points.map((p) => {
        if (p.link === undefined) return p;
        const id = cardMap.get(p.link);
        return id === undefined ? withoutLink(p) : { ...p, link: id };
      }),
    };
  };

  // Phase 3: Schreibaufträge und Zahlen.
  const cards: Card[] = [];
  const itemsAdd: ReviewItem[] = [];
  const itemsDelete: string[] = [];
  const events: NewEvent[] = [];
  const releaseMedia = new Set<string>();
  const counts = { new: 0, updated: 0, unchanged: 0, keptMine: 0, stayDeleted: 0 };
  for (const action of actions.values()) {
    switch (action.kind) {
      case 'new':
      case 'restore': {
        const card = copy ? relinkCopy(action.card) : relink(action.card);
        cards.push(card);
        itemsAdd.push(...buildItems(card, now));
        events.push({ at: now, type: 'cardImported', cardId: card.id, deckId: card.deckId });
        counts.new += 1;
        break;
      }
      case 'update': {
        const card = relink(action.card, action.local);
        cards.push(card);
        const { add, remove } = reconcileItems(card, itemsByCard.get(card.id) ?? [], now);
        itemsAdd.push(...add);
        itemsDelete.push(...remove);
        const still = new Set(mediaIdsOf(card));
        for (const id of mediaIdsOf(action.local)) if (!still.has(id)) releaseMedia.add(id);
        counts.updated += 1;
        break;
      }
      case 'keep':
        if (action.changed) counts.keptMine += 1;
        else counts.unchanged += 1;
        if (action.record && action.local.originHash !== action.base) {
          cards.push({ ...action.local, originHash: action.base });
        }
        break;
      case 'unchanged':
        counts.unchanged += 1;
        if (action.local.originHash !== action.base) {
          cards.push({ ...action.local, originHash: action.base });
        }
        break;
      case 'skip':
        counts.stayDeleted += 1;
        break;
    }
  }

  // Karten eines früheren Imports, die der Absender inzwischen entfernt hat, bleiben bei dir.
  const packIds = new Set(pack.cards.map((c) => c.id));
  const packDeckIds = new Set(pack.decks.map((d) => d.id));
  const missing = copy
    ? 0
    : local.cards.filter(
        (c) => packDeckIds.has(c.deckId) && !packIds.has(c.id) && c.originHash !== undefined,
      ).length;

  const summary: MergeSummary = {
    decksNew,
    decksKnown,
    cardsNew: counts.new,
    cardsUpdated: counts.updated,
    cardsUnchanged: counts.unchanged,
    cardsKeptMine: counts.keptMine,
    cardsStayDeleted: counts.stayDeleted,
    cardsMissingInFile: missing,
    mediaNew: newMedia.length,
    linksDropped,
  };
  const empty =
    counts.new === 0 &&
    counts.updated === 0 &&
    decksNew === 0 &&
    newMedia.length === 0 &&
    conflicts.length === 0;
  const nothing: MergeWrites = {
    areas: [],
    decks: [],
    media: [],
    cards: [],
    itemsAdd: [],
    itemsDelete: [],
    events: [],
    newCards: 0,
    releaseMedia: [],
  };
  return {
    mode,
    conflicts,
    summary,
    empty,
    writes: empty
      ? nothing
      : {
          areas: newAreas,
          decks: writeDecks,
          media: newMedia,
          cards,
          itemsAdd,
          itemsDelete,
          events,
          newCards: counts.new,
          releaseMedia: [...releaseMedia],
        },
  };
}

const noteOf = (note: string | undefined) => (note === undefined ? {} : { note });

function withoutLink<T extends { link?: string | undefined }>(point: T): Omit<T, 'link'> {
  return omit(point, 'link');
}
