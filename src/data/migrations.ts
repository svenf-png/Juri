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
