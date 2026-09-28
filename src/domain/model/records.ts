/**
 * Gespeicherte Datensätze (IndexedDB über Dexie, src/data/). Die zod-Schemas sind die einzige
 * Quelle der Typen und prüfen Datensätze beim Einspielen eines Backups.
 *
 * Stand M3: Profil, Metadaten, Rechtsgebiete, Stapel, Karten, Abfragen und Ereignisse. Die
 * übrigen Tabellen des Zielmodells (ADR-006) kommen mit ihren Meilensteinen dazu, jeweils mit
 * Schema und Migration. Zeitpunkte sind Millisekunden seit 1970 (UTC).
 */
import { hasGap } from '../cards/cloze';
import { normalizeName } from '../profile/name';
import { z } from '../zod';

const millis = z.number().int().nonnegative();

export const profileSchema = z.strictObject({
  id: z.literal('me'),
  name: z.string().refine((name) => name !== '' && name === normalizeName(name)),
  createdAt: millis,
  updatedAt: millis,
});

/** Profil der Person, die Juri auf diesem Gerät nutzt; genau ein Datensatz. */
export type Profile = z.infer<typeof profileSchema>;

export const metaEntrySchema = z.discriminatedUnion('key', [
  /** Onboarding abgeschlossen. */
  z.strictObject({ key: z.literal('onboardedAt'), value: millis }),
  /** Letztes erstelltes oder eingespieltes Backup. */
  z.strictObject({ key: z.literal('lastBackupAt'), value: millis }),
  /** Neue Karten seit dem letzten Backup (Backup-Erinnerung, gezählt ab M3). */
  z.strictObject({ key: z.literal('newCardsSinceBackup'), value: z.number().int().nonnegative() }),
]);

export type MetaEntry = z.infer<typeof metaEntrySchema>;
export type MetaKey = MetaEntry['key'];
export type MetaValues = { [E in MetaEntry as E['key']]: E['value'] };

/**
 * Metadaten, die nur dieses Gerät betreffen und deshalb nicht ins Backup gehören.
 * Beim Einspielen setzt Juri sie neu: letztes Backup = Zeitpunkt der Datei.
 */
export const DEVICE_META_KEYS: readonly MetaKey[] = ['lastBackupAt', 'newCardsSinceBackup'];

const id = z.string().min(1).max(80);

/** Einzeiliger Text ohne Leerraum am Rand. */
const singleLine = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^\S(?:.*\S)?$/u);
/** Wie `singleLine`, darf aber leer sein. */
const optionalLine = (max: number) =>
  z
    .string()
    .max(max)
    .regex(/^(?:\S(?:.*\S)?)?$/u);

/** Kürzel eines Rechtsgebiets: zwei bis vier Großbuchstaben oder Ziffern, z. B. „ÖR“. */
export const AREA_CODE = /^[A-ZÄÖÜ0-9]{2,4}$/u;

export const areaSchema = z.strictObject({
  id,
  code: z.string().regex(AREA_CODE),
  name: singleLine(60),
  createdAt: millis,
  updatedAt: millis,
});

/** Rechtsgebiet, z. B. Zivilrecht (ZR). Stapel liegen in einem oder mehreren davon. */
export type Area = z.infer<typeof areaSchema>;

export const deckSchema = z.strictObject({
  id,
  name: singleLine(80),
  /** Normen oder Beschreibung, z. B. „§ 839 BGB i. V. m. Art. 34 GG“; darf leer sein. */
  norm: optionalLine(200),
  areaIds: z
    .array(id)
    .min(1)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length),
  createdAt: millis,
  updatedAt: millis,
});

/** Stapel (Deck); gehört zu mindestens einem Rechtsgebiet (m:n). */
export type Deck = z.infer<typeof deckSchema>;

const tag = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[^\s#,]+$/u);

const cardBase = {
  id,
  deckId: id,
  norm: optionalLine(200),
  /** Ohne führendes „#“. */
  tags: z.array(tag).max(20),
  createdAt: millis,
  updatedAt: millis,
};

export const cardSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...cardBase,
    type: z.literal('qa'),
    front: z.string().min(1).max(2000),
    back: z.string().min(1).max(4000),
  }),
  z.strictObject({
    ...cardBase,
    type: z.literal('cloze'),
    /** Text mit Lücken in der Schreibweise `{{c1::Wort}}` (domain/cards/cloze.ts). */
    text: z.string().min(1).max(4000).refine(hasGap),
  }),
]);

/** Karte; Schema und Abdeckung kommen mit M5 und M6 als weitere Typen dazu. */
export type Card = z.infer<typeof cardSchema>;
export type CardType = Card['type'];

export const reviewItemSchema = z.strictObject({
  /** Frage: die Karten-ID; Lücke: `<Karten-ID>:c1` (deterministisch, siehe cards/card.ts). */
  id,
  cardId: id,
  /** Denormalisiert aus der Karte, damit Zählungen je Stapel ohne Verbindung auskommen. */
  deckId: id,
  /** Leer für die ganze Karte, sonst `c1`, `c2` … für eine Lücke. */
  sub: z.string().regex(/^(?:c[1-9]\d?)?$/),
  createdAt: millis,
});

/**
 * Abfrage: die kleinste lernbare Einheit. Eine Frage hat eine, ein Lückentext eine je Nummer.
 * Lernzustand (FSRS, Leitner, Fälligkeit) kommt mit M4; bis dahin ist jede Abfrage neu.
 */
export type ReviewItem = z.infer<typeof reviewItemSchema>;

export const eventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    seq: z.number().int().positive(),
    at: millis,
    type: z.literal('cardCreated'),
    cardId: id,
    deckId: id,
  }),
]);

/** Eintrag im Ereignis-Log (nur anhängen, nie ändern). Grundlage für Tagesziel und Verlauf. */
export type AppEvent = z.infer<typeof eventSchema>;
export type NewEvent = { [E in AppEvent as E['type']]: Omit<E, 'seq'> }[AppEvent['type']];

/** Schema je Tabelle; jede Tabelle der Datenbank braucht hier einen Eintrag. */
export const RECORD_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  profile: profileSchema,
  meta: metaEntrySchema,
  areas: areaSchema,
  decks: deckSchema,
  cards: cardSchema,
  reviewItems: reviewItemSchema,
  events: eventSchema,
};
