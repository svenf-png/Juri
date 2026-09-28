import {
  BackupError,
  encodeBackup,
  type BackupContent,
  type BackupInstance,
  type BackupTables,
} from '@/domain/backup/codec';
import { DEVICE_META_KEYS, RECORD_SCHEMAS, type MetaKey } from '@/domain/model/records';
import type { JuriDb } from './db';
import {
  MIGRATIONS,
  currentTables,
  migrateTables,
  schemaVersion,
  type Migration,
} from './migrations';

const isDeviceMeta = (record: Record<string, unknown>) =>
  DEVICE_META_KEYS.includes(record.key as MetaKey);

/** Alle Tabellen in Schlüsselreihenfolge, gelesen in einer Transaktion. */
export async function readTables(db: JuriDb): Promise<BackupTables> {
  const tables = db.allTables();
  return db.transaction('r', tables, async () => {
    const entries = await Promise.all(
      tables.map(async (t) => [t.name, await t.toArray()] as const),
    );
    return Object.fromEntries(entries);
  });
}

/** Backup-Datei aller Daten, ohne gerätebezogene Metadaten (DEVICE_META_KEYS). */
export async function exportBackup(
  db: JuriDb,
  createdAt: number,
  app: { instance: BackupInstance; version: string },
): Promise<Uint8Array<ArrayBuffer>> {
  const tables = await readTables(db);
  tables.meta = (tables.meta ?? []).filter((record) => !isDeviceMeta(record));
  return encodeBackup({ schemaVersion: schemaVersion(), createdAt, app, tables });
}

/**
 * Prüft ein Backup vollständig, bevor etwas überschrieben wird: Version, Migration auf den
 * aktuellen Stand, bekannte Tabellen, jeder Datensatz gegen sein Schema, genau ein Profil.
 */
export function prepareRestore(
  content: BackupContent,
  migrations: readonly Migration[] = MIGRATIONS,
): BackupTables {
  if (content.schemaVersion > schemaVersion(migrations)) throw new BackupError('neuere-version');
  const tables = migrateTables(content.tables, content.schemaVersion, migrations);
  const known = currentTables(migrations);
  for (const [name, records] of Object.entries(tables)) {
    const schema = RECORD_SCHEMAS[name];
    const key = known.get(name);
    if (!schema || !key) throw new BackupError('beschaedigt');
    const keys = new Set(records.map((r) => r[key]));
    if (keys.size !== records.length || !records.every((r) => schema.safeParse(r).success)) {
      throw new BackupError('beschaedigt');
    }
  }
  if (tables.profile?.length !== 1) throw new BackupError('beschaedigt');
  tables.meta = (tables.meta ?? []).filter((record) => !isDeviceMeta(record));
  return tables;
}

/**
 * Ersetzt alle Daten in einer Transaktion; scheitert etwas, bleibt alles unverändert.
 * Danach gilt das Backup selbst als letztes Backup.
 */
export async function restoreBackup(db: JuriDb, content: BackupContent): Promise<void> {
  const tables = prepareRestore(content);
  tables.meta = [
    ...(tables.meta ?? []),
    { key: 'lastBackupAt', value: content.createdAt },
    { key: 'newCardsSinceBackup', value: 0 },
  ];
  await replaceTables(db, tables);
}

/** Leert alle Tabellen und schreibt die übergebenen Datensätze (ungeprüft, z. B. Testdaten). */
export async function replaceTables(db: JuriDb, tables: BackupTables): Promise<void> {
  const all = db.allTables();
  await db.transaction('rw', all, async () => {
    for (const table of all) {
      await table.clear();
      const records = tables[table.name] ?? [];
      if (records.length > 0) await table.bulkAdd(records);
    }
  });
}
