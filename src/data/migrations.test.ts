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

describe('Version 2 (M3)', () => {
  it('hebt eine Datenbank aus M1 an, ohne Profil und Metadaten anzutasten', async () => {
    const { db, reopen } = testDb([MIGRATIONS[0]!]);
    await writeProfileName(db, 'Sven', 1);
    await db.meta.put({ key: 'onboardedAt', value: 1 });
    db.close();
    const upgraded = reopen(MIGRATIONS.slice(0, 2));
    expect((await readProfile(upgraded))?.name).toBe('Sven');
    expect(await upgraded.meta.get('onboardedAt')).toEqual({ key: 'onboardedAt', value: 1 });
    expect(upgraded.tables.map((t) => t.name).sort()).toEqual([
      'areas',
      'cards',
      'decks',
      'events',
      'meta',
      'profile',
      'reviewItems',
    ]);
    expect(await upgraded.cards.count()).toBe(0);
  });
});

describe('Version 3 (M4)', () => {
  const item = { id: 'k1', cardId: 'k1', deckId: 'd1', sub: '', createdAt: 5 };

  it('hebt eine Datenbank aus M3 an: Abfragen bleiben unverändert und gelten als neu', async () => {
    const { db, reopen } = testDb(MIGRATIONS.slice(0, 2));
    await writeProfileName(db, 'Sven', 1);
    await db.reviewItems.add(item);
    db.close();
    const upgraded = reopen(MIGRATIONS);
    expect(upgraded.verno).toBe(3);
    expect(await upgraded.reviewItems.get('k1')).toEqual(item);
    expect(upgraded.tables.map((t) => t.name)).toContain('reviewLog');
    expect(await upgraded.reviewLog.count()).toBe(0);
    expect((await readProfile(upgraded))?.name).toBe('Sven');
  });

  it('indiziert die Fälligkeit; neue Abfragen ohne `due` stehen nicht im Index', async () => {
    const { db } = testDb();
    await db.reviewItems.bulkAdd([
      item,
      { ...item, id: 'k2', cardId: 'k2', due: 100 },
      { ...item, id: 'k3', cardId: 'k3', due: 300 },
    ]);
    expect(await db.reviewItems.where('due').below(200).primaryKeys()).toEqual(['k2']);
    expect(await db.reviewItems.where('due').aboveOrEqual(0).count()).toBe(2);
  });
});
