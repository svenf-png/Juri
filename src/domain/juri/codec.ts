/**
 * `.juri` schreiben und prüfen (ADR-003, ADR-014). Reine Funktionen: Kodieren ist deterministisch
 * (gleicher Inhalt ergibt dieselben Bytes), Dekodieren lehnt fremde, beschädigte und manipulierte
 * Dateien ab, bevor irgendetwas gespeichert wird.
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { omit } from './omit';
import { linkedCardIds } from '../cards/schema';
import { sniffMedia } from '../media/media';
import type { Card } from '../model/records';
import {
  GREETING_FORMAT,
  JURI_FORMAT,
  JURI_FORMAT_VERSION,
  JURI_LIMITS,
  JuriError,
  MEDIA_EXTENSIONS,
  PACK_ID,
  cardsFileSchema,
  greetingManifestSchema,
  type GreetingManifest,
  manifestSchema,
  mediaPath,
  type JuriLimits,
  type JuriPackage,
  type PackMedia,
} from './format';

const MANIFEST = 'manifest.json';
const CARDS = 'cards.json';
const MEDIA_PATH = /^media\/[A-Za-z0-9][A-Za-z0-9_-]{0,79}\.(?:jpg|png|webp|pdf)$/;

export function encodeJuri(pack: JuriPackage): Uint8Array<ArrayBuffer> {
  const mtime = pack.manifest.createdAt;
  const media = [...pack.media].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const cardsFile = {
    decks: pack.decks,
    cards: pack.cards,
    media: media.map((m) => omit(m, 'data')),
  };
  const zip: Zippable = {
    [MANIFEST]: [strToU8(JSON.stringify(pack.manifest, null, 2)), { level: 6, mtime }],
    [CARDS]: [strToU8(JSON.stringify(cardsFile)), { level: 6, mtime }],
  };
  // Bilder und PDFs sind meist schon komprimiert und werden nur abgelegt.
  for (const m of media)
    zip[mediaPath(m.id, m.mime)] = [new Uint8Array(m.data), { level: 0, mtime }];
  return zipSync(zip);
}

export function decodeJuri(bytes: Uint8Array, limits: JuriLimits = JURI_LIMITS): JuriPackage {
  if (bytes.length === 0) throw new JuriError('leer');
  if (!isZip(bytes)) throw new JuriError('kein-juri');
  const { files, unexpected } = unzip(bytes, limits);
  const manifestBytes = files[MANIFEST];
  if (!manifestBytes) throw new JuriError('kein-juri');
  const raw = parseJson(manifestBytes);
  if (!isRecord(raw)) throw new JuriError('kein-juri');
  if (raw.format === 'juri-backup') throw new JuriError('ist-backup');
  if (raw.format === GREETING_FORMAT) throw new JuriError('ist-gruss');
  if (raw.format !== JURI_FORMAT) throw new JuriError('kein-juri');
  if (typeof raw.formatVersion === 'number' && raw.formatVersion > JURI_FORMAT_VERSION) {
    throw new JuriError('neuere-version');
  }
  if (unexpected.length > 0) throw new JuriError('beschaedigt');
  const manifest = manifestSchema.safeParse(raw);
  if (!manifest.success) throw new JuriError('beschaedigt', { cause: manifest.error });
  const cardsBytes = files[CARDS];
  if (!cardsBytes) throw new JuriError('beschaedigt');
  const file = cardsFileSchema.safeParse(parseJson(cardsBytes));
  if (!file.success) throw new JuriError('beschaedigt', { cause: file.error });

  // Herkunftsstand und Ablage sind Sache des Empfängers: nie aus einer fremden Datei übernehmen.
  const cards: Card[] = file.data.cards.map((card) => omit(card, 'originHash'));
  const media: PackMedia[] = file.data.media.map((meta) => {
    const data = files[mediaPath(meta.id, meta.mime)];
    if (!data || !MEDIA_EXTENSIONS[meta.mime]) throw new JuriError('beschaedigt');
    const sniffed = sniffMedia(data);
    if (
      data.length !== meta.size ||
      !sniffed ||
      sniffed.kind !== meta.kind ||
      sniffed.mime !== meta.mime
    ) {
      throw new JuriError('beschaedigt');
    }
    return { ...meta, data: data.slice().buffer };
  });
  const pack: JuriPackage = {
    manifest: manifest.data,
    decks: file.data.decks,
    cards,
    media,
  };
  // Jede Mediendatei gehört zu einer Beschreibung.
  const described = new Set(media.map((m) => mediaPath(m.id, m.mime)));
  for (const name of Object.keys(files)) {
    if (name.startsWith('media/') && !described.has(name)) throw new JuriError('beschaedigt');
  }
  verify(pack);
  return pack;
}

/** Gruß-Datei schreiben (M11): nur `manifest.json`, deterministisch wie `encodeJuri`. */
export function encodeGreeting(manifest: GreetingManifest): Uint8Array<ArrayBuffer> {
  const mtime = manifest.createdAt;
  return zipSync({
    [MANIFEST]: [strToU8(JSON.stringify(manifest, null, 2)), { level: 6, mtime }],
  });
}

/**
 * Gruß-Datei prüfen (M11): gleiche Grenzen und Whitelist wie `decodeJuri`, aber nur
 * `manifest.json` ist erlaubt. Eine `.juri`-Datei oder ein Backup ist keine Gruß-Datei.
 */
export function decodeGreeting(
  bytes: Uint8Array,
  limits: JuriLimits = JURI_LIMITS,
): GreetingManifest {
  if (bytes.length === 0) throw new JuriError('leer');
  if (!isZip(bytes)) throw new JuriError('kein-juri');
  const { files, unexpected } = unzip(bytes, limits, (name) => name === MANIFEST);
  const manifestBytes = files[MANIFEST];
  if (!manifestBytes) throw new JuriError('kein-juri');
  const raw = parseJson(manifestBytes);
  if (!isRecord(raw)) throw new JuriError('kein-juri');
  if (raw.format === 'juri-backup') throw new JuriError('ist-backup');
  if (raw.format === JURI_FORMAT) throw new JuriError('ist-stapel');
  if (raw.format !== GREETING_FORMAT) throw new JuriError('kein-juri');
  if (typeof raw.formatVersion === 'number' && raw.formatVersion > JURI_FORMAT_VERSION) {
    throw new JuriError('neuere-version');
  }
  if (unexpected.length > 0) throw new JuriError('beschaedigt');
  const manifest = greetingManifestSchema.safeParse(raw);
  if (!manifest.success) throw new JuriError('beschaedigt', { cause: manifest.error });
  return manifest.data;
}

/** Verweise und Zahlen: Nichts darf ins Leere zeigen, alles muss zum Manifest passen. */
function verify(pack: JuriPackage): void {
  const bad = () => new JuriError('beschaedigt');
  const { manifest } = pack;
  const deckIds = new Set(pack.decks.map((d) => d.id));
  if (deckIds.size !== pack.decks.length) throw bad();
  if (
    manifest.decks.length !== pack.decks.length ||
    manifest.counts.cards !== pack.cards.length ||
    manifest.counts.media !== pack.media.length
  ) {
    throw bad();
  }
  const perDeck = new Map<string, number>();
  const cardIds = new Set<string>();
  for (const card of pack.cards) {
    if (!PACK_ID.test(card.id) || cardIds.has(card.id) || !deckIds.has(card.deckId)) throw bad();
    cardIds.add(card.id);
    perDeck.set(card.deckId, (perDeck.get(card.deckId) ?? 0) + 1);
    if (!manifest.notes && card.note !== undefined) throw bad();
  }
  for (const entry of manifest.decks) {
    const deck = pack.decks.find((d) => d.id === entry.id);
    if (!deck || deck.name !== entry.name || (perDeck.get(entry.id) ?? 0) !== entry.cards) {
      throw bad();
    }
  }
  const media = new Map(pack.media.map((m) => [m.id, m]));
  if (media.size !== pack.media.length) throw bad();
  const used = new Set<string>();
  for (const card of pack.cards) {
    if (card.type === 'cover') {
      if (media.get(card.mediaId)?.kind !== 'image') throw bad();
      used.add(card.mediaId);
    }
    if (card.source?.mediaId !== undefined) {
      if (media.get(card.source.mediaId)?.kind !== 'pdf') throw bad();
      used.add(card.source.mediaId);
    }
    for (const target of linkedCardIds(card)) {
      if (target === card.id || !cardIds.has(target)) throw bad();
    }
  }
  for (const id of media.keys()) if (!used.has(id)) throw bad();
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function unzip(
  bytes: Uint8Array,
  limits: JuriLimits,
  allowed: (name: string) => boolean = (name) =>
    name === MANIFEST || name === CARDS || MEDIA_PATH.test(name),
): { files: Record<string, Uint8Array>; unexpected: string[] } {
  let entries = 0;
  let total = 0;
  const declared = new Map<string, number>();
  const unexpected: string[] = [];
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter(file) {
        entries += 1;
        total += file.originalSize;
        if (entries > limits.maxEntries || total > limits.maxBytes) throw new JuriError('zu-gross');
        const cap =
          file.name === MANIFEST
            ? limits.maxManifestBytes
            : file.name === CARDS
              ? limits.maxJsonBytes
              : limits.maxMediaBytes;
        if (file.originalSize > cap) throw new JuriError('zu-gross');
        if (
          file.originalSize > 1_000_000 &&
          file.originalSize / Math.max(1, file.size) > limits.maxRatio
        ) {
          throw new JuriError('zu-gross');
        }
        if (!allowed(file.name)) {
          unexpected.push(file.name);
          return false;
        }
        declared.set(file.name, file.originalSize);
        return true;
      },
    });
  } catch (error) {
    if (error instanceof JuriError) throw error;
    throw new JuriError('beschaedigt', { cause: error });
  }
  for (const [name, data] of Object.entries(files)) {
    if (declared.get(name) !== data.length) throw new JuriError('beschaedigt');
  }
  return { files, unexpected };
}

function parseJson(data: Uint8Array): unknown {
  try {
    return JSON.parse(strFromU8(data));
  } catch (error) {
    throw new JuriError('beschaedigt', { cause: error });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}
