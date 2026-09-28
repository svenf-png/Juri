import { describe, expect, it } from 'vitest';
import { RECORD_SCHEMAS } from '@/domain/model/records';
import { readProfile, writeProfileName } from './repositories/profile';
import {
  MIGRATIONS,
  currentTables,
  migrateTables,
  primaryKey,
  schemaVersion,
  type Migration,
} from './migrations';
import { testDb } from './testDb';

/** Erfundene Versionen, um den Mechanismus unabhängig vom echten Schema zu prüfen. */
const v1: Migration = {
  version: 1,
  stores: { profile: 'id', meta: 'key', karten: 'id', alt: 'id' },
};
const v2: Migration = {
  version: 2,
  stores: { karten: 'id, deckId', alt: null },
  upgrade: { karten: (record) => ({ ...record, deckId: 'zr' }) },
};

describe('Migrationen', () => {
  it('sind lückenlos ab Version 1 und haben für jede Tabelle ein Schema', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect([...currentTables().keys()].sort()).toEqual(Object.keys(RECORD_SCHEMAS).sort());
    expect(schemaVersion()).toBe(MIGRATIONS.length);
    expect(schemaVersion([])).toBe(0);
  });

  it.each([
    ['id', 'id'],
    ['++seq, at', 'seq'],
    ['&key, value', 'key'],
  ])('Primärschlüssel aus „%s“ ist „%s“', (spec, key) => {
    expect(primaryKey(spec)).toBe(key);
  });

  it('kennt die Tabellen der neuesten Version', () => {
    expect(Object.fromEntries(currentTables([v1, v2]))).toEqual({
      profile: 'id',
      meta: 'key',
      karten: 'id',
    });
  });

  it('heben eine bestehende Datenbank an und behalten alle übrigen Daten', async () => {
    const { db, reopen } = testDb([v1]);
    await writeProfileName(db, 'Sven', 1);
    await db.table('karten').bulkAdd([{ id: 'k1', text: 'Gewahrsam' }]);
    await db.table('alt').add({ id: 'x' });
    db.close();

    const upgraded = reopen([v1, v2]);
    expect(await upgraded.table('karten').where('deckId').equals('zr').toArray()).toEqual([
      { id: 'k1', text: 'Gewahrsam', deckId: 'zr' },
    ]);
    expect(upgraded.tables.map((t) => t.name)).not.toContain('alt');
    expect((await readProfile(upgraded))?.name).toBe('Sven');
    expect(upgraded.verno).toBe(2);
  });

  it('wenden dieselben Umformungen auf ältere Backups an', () => {
    const tables = { karten: [{ id: 'k1' }], alt: [{ id: 'x' }], profile: [] };
    expect(migrateTables(tables, 1, [v1, v2])).toEqual({
      karten: [{ id: 'k1', deckId: 'zr' }],
      profile: [],
    });
    expect(migrateTables(tables, 2, [v1, v2])).toEqual(tables);
  });
});
