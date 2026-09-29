/**
 * Gespeicherte Datensätze (IndexedDB über Dexie, src/data/). Die zod-Schemas sind die einzige
 * Quelle der Typen und prüfen Datensätze beim Einspielen eines Backups.
 *
 * Stand M5: Profil, Metadaten, Rechtsgebiete, Stapel, Karten, Abfragen mit Lernzustand, Lernlog
 * und Ereignisse. Die übrigen Tabellen des Zielmodells (ADR-006) kommen mit ihren Meilensteinen
 * dazu, jeweils mit Schema und Migration. Zeitpunkte sind Millisekunden seit 1970 (UTC).
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

export const learningSettingsSchema = z.strictObject({
  algorithm: z.enum(['fsrs', 'leitner']),
  retention: z.number().int().min(80).max(97),
  newPerDay: z.number().int().min(0).max(100),
  leitnerDays: z
    .tuple([
      z.number().int().min(1).max(180),
      z.number().int().min(1).max(180),
      z.number().int().min(1).max(180),
      z.number().int().min(1).max(180),
      z.number().int().min(1).max(180),
    ])
    .refine((days) => days.every((d, i) => i === 0 || d >= (days[i - 1] ?? 0))),
});

export const metaEntrySchema = z.discriminatedUnion('key', [
  /** Onboarding abgeschlossen. */
  z.strictObject({ key: z.literal('onboardedAt'), value: millis }),
  /** Letztes erstelltes oder eingespieltes Backup. */
  z.strictObject({ key: z.literal('lastBackupAt'), value: millis }),
  /** Neue Karten seit dem letzten Backup (Backup-Erinnerung, gezählt ab M3). */
  z.strictObject({ key: z.literal('newCardsSinceBackup'), value: z.number().int().nonnegative() }),
  /** Einstellungen des Lernrhythmus (M4); fehlt der Eintrag, gelten die Voreinstellungen. */
  z.strictObject({ key: z.literal('learning'), value: learningSettingsSchema }),
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
  /** Eigene Notiz (Entscheidung 5); erscheint beim Lernen unter der Antwort. */
  note: z.string().min(1).max(2000).optional(),
  createdAt: millis,
  updatedAt: millis,
};

/** Größte Einrückung einer Gliederung: 1., a), aa). */
export const SCHEMA_MAX_LEVEL = 3;
/** Höchstzahl der Punkte eines Schemas. */
export const SCHEMA_MAX_POINTS = 60;

/**
 * Punkt einer Gliederung. `id` bleibt beim Bearbeiten stehen (Verknüpfungen, Merge in M9);
 * `level` ist die Einrückung (1 bis 3); `link` ist die verknüpfte Karte (ADR-009).
 */
export const schemaPointSchema = z.strictObject({
  id: z.string().regex(/^p[1-9]\d{0,3}$/),
  level: z.number().int().min(1).max(SCHEMA_MAX_LEVEL),
  text: singleLine(200),
  /** Norm des Punkts, z. B. „§ 42 II VwGO“; fehlt, wenn es keine gibt. */
  norm: singleLine(200).optional(),
  /** Inhalt des Punkts (Definition, Prüfungsinhalt); erscheint beim Aufdecken (Entscheidung 4). */
  content: z.string().min(1).max(2000).optional(),
  /** Verknüpfte Karte; fehlt, wenn es keine gibt. */
  link: id.optional(),
});

export type SchemaPoint = z.infer<typeof schemaPointSchema>;

/** Punkte in Lesereihenfolge: der erste auf Ebene 1, jede Ebene höchstens eine tiefer als die davor. */
const schemaPoints = z
  .array(schemaPointSchema)
  .min(1)
  .max(SCHEMA_MAX_POINTS)
  .refine(
    (points) =>
      new Set(points.map((p) => p.id)).size === points.length &&
      points.every((p, i) => p.level <= (i === 0 ? 1 : (points[i - 1]?.level ?? 0) + 1)),
  );

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
  z.strictObject({
    ...cardBase,
    type: z.literal('schema'),
    title: singleLine(200),
    points: schemaPoints,
  }),
]);

/** Karte; die Abdeckung kommt mit M6 als weiterer Typ dazu. */
export type Card = z.infer<typeof cardSchema>;
export type CardType = Card['type'];

/** FSRS-Zustand einer Abfrage (ts-fsrs 5.x, ADR-004); Zeiten in Millisekunden. */
export const fsrsStateSchema = z.strictObject({
  due: millis,
  stability: z.number().nonnegative(),
  difficulty: z.number().nonnegative(),
  scheduledDays: z.number().nonnegative(),
  learningSteps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  /** 0 neu, 1 Lernen, 2 Wiederholen, 3 Wiederlernen. */
  state: z.number().int().min(0).max(3),
  lastReview: millis.optional(),
});
export type FsrsState = z.infer<typeof fsrsStateSchema>;

/** Leitner-Zustand: Fach 1 bis 5 mit eigener Fälligkeit. */
export const leitnerStateSchema = z.strictObject({
  box: z.number().int().min(1).max(5),
  due: millis,
});
export type LeitnerState = z.infer<typeof leitnerStateSchema>;

/** Lernzustand einer Abfrage; beide Algorithmen laufen parallel (ADR-004). */
const learningState = {
  fsrs: fsrsStateSchema.optional(),
  leitner: leitnerStateSchema.optional(),
  /** Fälligkeit des aktiven Algorithmus als Index; fehlt bei neuen Abfragen. */
  due: millis.optional(),
  lastReviewedAt: millis.optional(),
};

export const reviewItemSchema = z.strictObject({
  /** Frage: die Karten-ID; Lücke: `<Karten-ID>:c1` (deterministisch, siehe cards/card.ts). */
  id,
  cardId: id,
  /** Denormalisiert aus der Karte, damit Zählungen je Stapel ohne Verbindung auskommen. */
  deckId: id,
  /** Leer für die ganze Karte, sonst `c1`, `c2` … für eine Lücke. */
  sub: z.string().regex(/^(?:c[1-9]\d?)?$/),
  createdAt: millis,
  ...learningState,
});

/**
 * Abfrage: die kleinste lernbare Einheit. Eine Frage hat eine, ein Lückentext eine je Nummer.
 * Neue Abfragen haben keinen Lernzustand; die erste Bewertung legt FSRS und Leitner an.
 */
export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** Lernzustand vor einer Bewertung, vollständig, damit Undo den Vorzustand herstellen kann. */
export const itemSnapshotSchema = z.strictObject(learningState);
export type ItemSnapshot = z.infer<typeof itemSnapshotSchema>;

/** Eine Bewertung (Lernlog, ADR-004). Enthält alle Felder für eine spätere FSRS-Optimierung. */
export const reviewLogSchema = z.strictObject({
  seq: z.number().int().positive(),
  at: millis,
  itemId: id,
  cardId: id,
  deckId: id,
  /** 1 Nochmal, 2 Schwer, 3 Gut, 4 Leicht. */
  rating: z.number().int().min(1).max(4),
  /** Aktiver Algorithmus zum Zeitpunkt der Bewertung. */
  algorithm: z.enum(['fsrs', 'leitner']),
  /** Die Abfrage war vor dieser Bewertung neu (zählt für „Neue Karten pro Tag“). */
  wasNew: z.boolean(),
  /** ts-fsrs-Protokoll: Zustand, Stabilität und Schwierigkeit vor der Bewertung, Abstände in Tagen. */
  fsrs: z.strictObject({
    state: z.number().int().min(0).max(3),
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsedDays: z.number().nonnegative(),
    scheduledDays: z.number().nonnegative(),
    learningSteps: z.number().int().nonnegative(),
  }),
  /** Vollständiger Lernzustand der Abfrage vor der Bewertung (Undo). */
  before: itemSnapshotSchema,
});

/** Bewertungen in der Reihenfolge des Lernens; Undo löscht die letzte einer Abfrage. */
export type ReviewLogEntry = z.infer<typeof reviewLogSchema>;
export type NewReviewLogEntry = Omit<ReviewLogEntry, 'seq'>;

export const eventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    seq: z.number().int().positive(),
    at: millis,
    type: z.literal('cardCreated'),
    cardId: id,
    deckId: id,
  }),
  /** Eine Abfrage wurde bewertet (M4); Grundlage für Tagesziel und Statistik (M8). */
  z.strictObject({
    seq: z.number().int().positive(),
    at: millis,
    type: z.literal('reviewed'),
    cardId: id,
    deckId: id,
    itemId: id,
    rating: z.number().int().min(1).max(4),
    /** Erste Bewertung dieser Abfrage überhaupt. */
    first: z.boolean(),
  }),
  /** Die letzte Bewertung einer Abfrage wurde zurückgenommen; hebt ein `reviewed` auf. */
  z.strictObject({
    seq: z.number().int().positive(),
    at: millis,
    type: z.literal('reviewUndone'),
    cardId: id,
    deckId: id,
    itemId: id,
    rating: z.number().int().min(1).max(4),
    first: z.boolean(),
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
  reviewLog: reviewLogSchema,
  events: eventSchema,
};
