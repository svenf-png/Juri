/**
 * Dateiformat `.juri` (ADR-003, ADR-014): ZIP mit `manifest.json`, `cards.json` (Stapel, Karten,
 * Medien-Beschreibung, ohne Lernfortschritt) und `media/<id>.<ext>`. Dieses Modul legt Schemas,
 * Grenzen und Fehler fest; Kodieren und Prüfen stehen in `codec.ts`.
 */
import {
  AREA_CODE,
  SENDER_ID,
  achievementsSchema,
  cardSchema,
  mediaSchema,
  optionalLine,
  singleLine,
} from '../model/records';
import { normalizeName } from '../profile/name';
import { z } from '../zod';

export const JURI_FORMAT = 'juri';
/** Gruß-Datei (M11, ADR-015): ZIP mit nur `manifest.json`, trägt High fives und keine Karten. */
export const GREETING_FORMAT = 'juri-gruss';
export const GREETING_EXTENSION = '.juri-gruss';
export const JURI_FORMAT_VERSION = 1;
export const JURI_EXTENSION = '.juri';

/** MIME-Typ beim Teilen (ADR-003): iOS bietet für `application/octet-stream` das Teilen-Menü an. */
export const JURI_MIME = 'application/octet-stream';

export interface JuriLimits {
  /** Einträge im ZIP (Manifest, Karten und Medien). */
  maxEntries: number;
  /** Summe der entpackten Größen. */
  maxBytes: number;
  /** Entpackte Größe eines Mediums. */
  maxMediaBytes: number;
  /** Entpackte Größe von `cards.json`. */
  maxJsonBytes: number;
  maxManifestBytes: number;
  maxCards: number;
  maxDecks: number;
  maxMedia: number;
  /** Größtes Verhältnis entpackt zu gepackt bei Einträgen über 1 MB (Zip-Bombe). */
  maxRatio: number;
}

/** Grenzen beim Entpacken: Annahmen, nicht gemessen; eine manipulierte Datei soll das Gerät nicht überlasten. */
export const JURI_LIMITS: JuriLimits = {
  maxEntries: 1_002,
  maxBytes: 250_000_000,
  maxMediaBytes: 60_000_000,
  maxJsonBytes: 20_000_000,
  maxManifestBytes: 300_000,
  maxCards: 5_000,
  maxDecks: 50,
  maxMedia: 1_000,
  maxRatio: 200,
};

export type JuriErrorCode =
  | 'leer'
  | 'kein-juri'
  | 'ist-backup'
  | 'ist-gruss'
  | 'ist-stapel'
  | 'beschaedigt'
  | 'neuere-version'
  | 'zu-gross';

export const JURI_ERROR_MESSAGES: Readonly<Record<JuriErrorCode, string>> = {
  leer: 'Die Datei ist leer.',
  'kein-juri': 'Diese Datei ist kein Juri-Stapel.',
  'ist-backup':
    'Das ist ein Backup und kein geteilter Stapel. Backups spielst du in den Einstellungen ein.',
  'ist-gruss':
    'Das ist eine Gruß-Datei und kein geteilter Stapel. Gruß-Dateien öffnest du unter „High fives“.',
  'ist-stapel': 'Das ist ein Stapel und keine Gruß-Datei. Stapel öffnest du unter „Teilen“.',
  beschaedigt: 'Die Datei ist beschädigt oder wurde verändert und kann nicht importiert werden.',
  'neuere-version':
    'Die Datei stammt aus einer neueren Juri-Version. Bitte aktualisiere Juri zuerst.',
  'zu-gross': 'Die Datei ist zu groß für dieses Gerät.',
};

export class JuriError extends Error {
  readonly code: JuriErrorCode;

  constructor(code: JuriErrorCode, options?: ErrorOptions) {
    super(JURI_ERROR_MESSAGES[code], options);
    this.name = 'JuriError';
    this.code = code;
  }
}

/** IDs in der Datei: sie werden zu Dateinamen (`media/<id>.<ext>`), deshalb nur sichere Zeichen. */
export const PACK_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

const packId = z.string().regex(PACK_ID);
const count = z.number().int().nonnegative();
const millis = z.number().int().nonnegative();

/** Erlaubte Medien und ihre Dateiendung; alles andere lehnt die Prüfung ab. */
export const MEDIA_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export { achievementsSchema, type Achievements } from '../model/records';

/** Obergrenze je Datei: Mitreise und Gruß-Datei (ADR-015). */
export const MAX_HIGH_FIVES_PER_FILE = 50;

/**
 * Ein High five in der Datei (A9, M11, ADR-015). Der Absender steht im Manifest (`sender.id`),
 * `to` nennt den Empfänger, falls bekannt (fremde High fives lässt der Empfänger liegen), `win`
 * den Anlass ohne Namen. `id` macht den Import wiederholbar: dieselbe ID zählt nur einmal.
 */
export const highFiveSchema = z.strictObject({
  id: packId,
  at: millis,
  to: packId.optional(),
  win: singleLine(80).optional(),
});
export type HighFive = z.infer<typeof highFiveSchema>;

export const manifestSchema = z
  .strictObject({
    format: z.literal(JURI_FORMAT),
    formatVersion: z.number().int().min(1).max(JURI_FORMAT_VERSION),
    createdAt: millis,
    app: z.strictObject({ version: z.string().max(40) }),
    /** Anzeigename des Absenders; nicht authentifiziert (ADR-003). */
    sender: z
      .strictObject({
        name: z.string().refine((name) => name !== '' && name === normalizeName(name)),
        /** Zufällige ID des Profils (M11); gleiche ID, gleicher Kontakt. Nicht authentifiziert. */
        id: z.string().regex(SENDER_ID).optional(),
      })
      .optional(),
    /** Ob eigene Notizen mitgeschickt wurden (Entscheidung 5). */
    notes: z.boolean(),
    decks: z
      .array(z.strictObject({ id: packId, name: singleLine(80), cards: count }))
      .min(1)
      .max(JURI_LIMITS.maxDecks),
    counts: z.strictObject({ cards: count, media: count }),
    achievements: achievementsSchema.optional(),
    highFives: z.array(highFiveSchema).max(MAX_HIGH_FIVES_PER_FILE).optional(),
  })
  .refine((m) => new Set(m.decks.map((d) => d.id)).size === m.decks.length);
export type Manifest = z.infer<typeof manifestSchema>;

/** Manifest der Gruß-Datei: Absender mit ID ist Pflicht, mindestens ein High five, keine Karten. */
export const greetingManifestSchema = z.strictObject({
  format: z.literal(GREETING_FORMAT),
  formatVersion: z.number().int().min(1).max(JURI_FORMAT_VERSION),
  createdAt: millis,
  app: z.strictObject({ version: z.string().max(40) }),
  sender: z.strictObject({
    name: z.string().refine((name) => name !== '' && name === normalizeName(name)),
    id: z.string().regex(SENDER_ID),
  }),
  achievements: achievementsSchema.optional(),
  highFives: z.array(highFiveSchema).min(1).max(MAX_HIGH_FIVES_PER_FILE),
});
export type GreetingManifest = z.infer<typeof greetingManifestSchema>;

/** Stapel in der Datei: Rechtsgebiete stehen als Kürzel und Name, ihre IDs sind Sache des Empfängers. */
export const packDeckSchema = z.strictObject({
  id: packId,
  name: singleLine(80),
  norm: optionalLine(200),
  areas: z
    .array(z.strictObject({ code: z.string().regex(AREA_CODE), name: singleLine(60) }))
    .min(1)
    .max(30),
  createdAt: millis,
});
export type PackDeck = z.infer<typeof packDeckSchema>;

/** Beschreibung eines Mediums; die Bytes liegen in `media/<id>.<ext>`. */
export const packMediaSchema = mediaSchema.omit({ data: true, createdAt: true });
export type PackMediaMeta = z.infer<typeof packMediaSchema>;

export const cardsFileSchema = z.strictObject({
  decks: z.array(packDeckSchema).min(1).max(JURI_LIMITS.maxDecks),
  cards: z.array(cardSchema).max(JURI_LIMITS.maxCards),
  media: z.array(packMediaSchema).max(JURI_LIMITS.maxMedia),
});

/** Ein Medium samt Bytes. */
export interface PackMedia extends PackMediaMeta {
  readonly data: ArrayBuffer;
}

/** Inhalt einer `.juri`-Datei, geprüft (decodeJuri) oder zum Schreiben bereit (encodeJuri). */
export interface JuriPackage {
  readonly manifest: Manifest;
  readonly decks: readonly PackDeck[];
  readonly cards: readonly z.infer<typeof cardSchema>[];
  readonly media: readonly PackMedia[];
}

export function mediaPath(id: string, mime: string): string {
  return `media/${id}.${MEDIA_EXTENSIONS[mime] ?? 'bin'}`;
}
