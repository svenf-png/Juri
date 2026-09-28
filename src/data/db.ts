import { Dexie, type DexieOptions, type EntityTable, type Table } from 'dexie';
import type { BackupRecord } from '@/domain/backup/codec';
import type {
  AppEvent,
  Area,
  Card,
  Deck,
  MetaEntry,
  MetaKey,
  NewEvent,
  Profile,
  ReviewItem,
} from '@/domain/model/records';
import { MIGRATIONS, type Migration } from './migrations';

/** Datenbank einer Instanz: `juri` oder `juri-test` (ADR-005), Schema aus MIGRATIONS. */
export class JuriDb extends Dexie {
  declare profile: EntityTable<Profile, 'id'>;
  declare meta: Table<MetaEntry, MetaKey>;
  declare areas: EntityTable<Area, 'id'>;
  declare decks: EntityTable<Deck, 'id'>;
  declare cards: EntityTable<Card, 'id'>;
  declare reviewItems: EntityTable<ReviewItem, 'id'>;
  declare events: Table<AppEvent, number, NewEvent>;

  constructor(
    name: string,
    options: DexieOptions = {},
    migrations: readonly Migration[] = MIGRATIONS,
  ) {
    super(name, options);
    for (const migration of migrations) {
      const version = this.version(migration.version).stores(migration.stores);
      const upgrade = migration.upgrade;
      if (!upgrade) continue;
      version.upgrade(async (tx) => {
        for (const [table, transform] of Object.entries(upgrade)) {
          await tx
            .table<BackupRecord>(table)
            .toCollection()
            .modify((record, ctx) => {
              ctx.value = transform(record);
            });
        }
      });
    }
  }

  /** Alle Tabellen mit einheitlichem Datensatz-Typ, z. B. für Backups. */
  allTables(): Table<BackupRecord>[] {
    return this.tables.map((t) => this.table<BackupRecord>(t.name));
  }
}
