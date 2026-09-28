import { describe, expect, it } from 'vitest';
import { BackupError, decodeBackup, type BackupContent } from '@/domain/backup/codec';
import { exportBackup, prepareRestore, readTables, replaceTables, restoreBackup } from './backup';
import { readMeta, readProfile, writeMeta, writeProfileName } from './repositories/profile';
import { schemaVersion } from './migrations';
import { testDb } from './testDb';

const T0 = new Date(2026, 8, 1, 9).getTime();
const T1 = new Date(2026, 8, 28, 20).getTime();
const app = { instance: 'app', version: '0.2.0' } as const;

async function seeded(name = 'Sven') {
  const { db, reopen } = testDb();
  await writeProfileName(db, name, T0);
  await writeMeta(db, 'onboardedAt', T0);
  await writeMeta(db, 'lastBackupAt', T0);
  await writeMeta(db, 'newCardsSinceBackup', 7);
  return { db, reopen };
}

function content(tables: BackupContent['tables'], version = schemaVersion()): BackupContent {
  return { schemaVersion: version, createdAt: T1, app, tables };
}

const profile = { id: 'me', name: 'Sven', createdAt: T0, updatedAt: T0 };

describe('Daten', () => {
  it('überleben das Schließen und erneute Öffnen der Datenbank', async () => {
    const { db, reopen } = await seeded();
    const before = await readTables(db);
    db.close();
    const again = reopen();
    expect(await readTables(again)).toEqual(before);
    expect((await readProfile(again))?.name).toBe('Sven');
  });
});

describe('Backup', () => {
  it('Roundtrip: Export, Einspielen und erneuter Export sind byte-identisch', async () => {
    const { db } = await seeded();
    const first = await exportBackup(db, T1, app);

    const target = testDb().db;
    await writeProfileName(target, 'Max', T0);
    await restoreBackup(target, decodeBackup(first));

    expect(await exportBackup(target, T1, app)).toEqual(first);
    expect(await readProfile(target)).toEqual(await readProfile(db));
    expect(await readMeta(target)).toEqual({
      onboardedAt: T0,
      lastBackupAt: T1,
      newCardsSinceBackup: 0,
    });
  });

  it('nimmt gerätebezogene Metadaten nicht mit', async () => {
    const { db } = await seeded();
    const decoded = decodeBackup(await exportBackup(db, T1, app));
    expect(decoded.tables.meta).toEqual([{ key: 'onboardedAt', value: T0 }]);
    expect(decoded).toMatchObject({ schemaVersion: schemaVersion(), createdAt: T1, app });
  });

  it.each([
    ['unbekannte Tabelle', { profile: [profile], fremd: [{ id: 1 }] }],
    ['ungültiger Datensatz', { profile: [{ ...profile, name: ' Sven ' }] }],
    ['kein Profil', { profile: [], meta: [] }],
    [
      'doppelter Schlüssel',
      {
        profile: [profile],
        meta: [
          { key: 'onboardedAt', value: 1 },
          { key: 'onboardedAt', value: 2 },
        ],
      },
    ],
  ])('lehnt ab und ändert nichts: %s', async (_, tables) => {
    const { db } = await seeded('Max');
    const before = await readTables(db);
    await expect(restoreBackup(db, content(tables))).rejects.toMatchObject({ code: 'beschaedigt' });
    expect(await readTables(db)).toEqual(before);
  });

  it('lehnt Backups aus einer neueren Schema-Version ab', () => {
    expect(() => prepareRestore(content({ profile: [profile] }, schemaVersion() + 1))).toThrow(
      BackupError,
    );
  });

  it('ignoriert gerätebezogene Metadaten aus der Datei', () => {
    const tables = prepareRestore(
      content({ profile: [profile], meta: [{ key: 'lastBackupAt', value: 5 }] }),
    );
    expect(tables.meta).toEqual([]);
  });

  it('schreibt alles in einer Transaktion: Fehler lassen den alten Stand stehen', async () => {
    const { db } = await seeded('Max');
    const before = await readTables(db);
    const broken = { profile: [profile, profile] };
    await expect(replaceTables(db, broken)).rejects.toThrow();
    expect(await readTables(db)).toEqual(before);
  });
});
