import type { BackupRecord, BackupTables } from '@/domain/backup/codec';

export interface Migration {
  /** Fortlaufend ab 1. */
  version: number;
  /** Geänderte Tabellen in Dexie-Schreibweise (Primärschlüssel, Indizes); `null` entfernt. */
  stores: Readonly<Record<string, string | null>>;
  /**
   * Wandelt Datensätze der Vorversion um. Gilt für die Datenbank (Dexie-Upgrade) und
   * genauso für Backups aus älteren Versionen (migrateTables).
   */
  upgrade?: Readonly<Record<string, (record: BackupRecord) => BackupRecord>>;
}

/**
 * Versionen des Datenbankschemas (ADR-006). Bestehende Einträge nie ändern, nur anhängen:
 * Jede neue Tabelle, jeder neue Index und jede Umformung braucht eine neue Version.
 */
export const MIGRATIONS: readonly Migration[] = [
  { version: 1, stores: { profile: 'id', meta: 'key' } },
  {
    // M3: Rechtsgebiete, Stapel (m:n über den Mehrfach-Index areaIds), Karten, Abfragen, Ereignisse.
    version: 2,
    stores: {
      areas: 'id, code',
      decks: 'id, *areaIds',
      cards: 'id, deckId, createdAt, *tags',
      reviewItems: 'id, cardId, deckId',
      events: '++seq, at, type',
    },
  },
  {
    // M4: Lernzustand an den Abfragen (optionale Felder `fsrs`, `leitner`, `due`, `lastReviewedAt`;
    // bestehende Abfragen sind damit „neu“, keine Umformung nötig), Index auf `due` für die
    // Fälligkeit, und das Lernlog `reviewLog` (Undo, Tagesbilanz, spätere FSRS-Optimierung).
    version: 3,
    stores: {
      reviewItems: 'id, cardId, deckId, due',
      reviewLog: '++seq, itemId, at',
    },
  },
  {
    // M5: Schema-Karten (neuer Kartentyp `schema`, ohne Umformung) und ein Index auf `type`, damit
    // Löschen die Schemas mit Verknüpfungen ohne Vollzugriff findet (ADR-009). Die Version trennt
    // Backups mit Schemas sauber von älteren App-Ständen, die den Typ nicht kennen.
    version: 4,
    stores: {
      cards: 'id, deckId, createdAt, *tags, type',
    },
  },
  {
    // M6: Medien (Bilder und PDFs als ArrayBuffer, ADR-002) und Indizes auf die Verweise der Karten
    // (`mediaId` der Abdeckung, `source.mediaId` der Herkunft), damit Löschen ungenutzte Medien
    // ohne Vollzugriff findet (ADR-010). Neuer Kartentyp `cover` und Feld `source` ohne Umformung.
    version: 5,
    stores: {
      media: 'id, kind',
      cards: 'id, deckId, createdAt, *tags, type, mediaId, source.mediaId',
    },
  },
  {
    // M8: Fristen (Prüfung, Klausur, Modul) mit Umfang und Endspurt. Die Tabelle ist klein (einige
    // Datensätze), Zugriffe lesen sie ganz; Fristen ändern nie gespeicherte Abfragen (ADR-012).
    version: 6,
    stores: { deadlines: 'id' },
  },
];

export function schemaVersion(migrations: readonly Migration[] = MIGRATIONS): number {
  return migrations.at(-1)?.version ?? 0;
}

/** Tabellen der neuesten Version mit ihrem Primärschlüssel, z. B. `{ profile: 'id' }`. */
export function currentTables(migrations: readonly Migration[] = MIGRATIONS): Map<string, string> {
  const tables = new Map<string, string>();
  for (const migration of migrations) {
    for (const [name, spec] of Object.entries(migration.stores)) {
      if (spec === null) tables.delete(name);
      else tables.set(name, primaryKey(spec));
    }
  }
  return tables;
}

/** Primärschlüssel aus der Dexie-Schreibweise: „++seq, at“ → „seq“. */
export function primaryKey(spec: string): string {
  return (spec.split(',')[0] ?? '').trim().replace(/^(\+\+|&)/, '');
}

/** Bringt die Tabellen eines Backups der Version `from` auf den neuesten Stand. */
export function migrateTables(
  tables: BackupTables,
  from: number,
  migrations: readonly Migration[] = MIGRATIONS,
): BackupTables {
  const result = new Map(Object.entries(tables));
  for (const migration of migrations) {
    if (migration.version <= from) continue;
    for (const [name, spec] of Object.entries(migration.stores)) {
      if (spec === null) result.delete(name);
    }
    for (const [name, upgrade] of Object.entries(migration.upgrade ?? {})) {
      const records = result.get(name);
      if (records) result.set(name, records.map(upgrade));
    }
  }
  return Object.fromEntries(result);
}
