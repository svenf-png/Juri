import { describe, expect, it } from 'vitest';
import { testDb } from '../testDb';
import { readMeta, readProfile, writeMeta, writeProfileName } from './profile';

describe('Profil', () => {
  it('wird angelegt und umbenannt; der Anlagezeitpunkt bleibt', async () => {
    const { db } = testDb();
    expect(await readProfile(db)).toBeNull();
    await writeProfileName(db, 'Sven', 10);
    const renamed = await writeProfileName(db, 'Sven F.', 20);
    expect(renamed).toEqual({ id: 'me', name: 'Sven F.', createdAt: 10, updatedAt: 20 });
    expect(await readProfile(db)).toEqual(renamed);
  });

  it('nimmt nur bereinigte Namen an', async () => {
    const { db } = testDb();
    await expect(writeProfileName(db, '  ', 1)).rejects.toThrow();
    expect(await readProfile(db)).toBeNull();
  });
});

describe('Metadaten', () => {
  it('speichern je Schlüssel einen Wert', async () => {
    const { db } = testDb();
    expect(await readMeta(db)).toEqual({});
    await writeMeta(db, 'onboardedAt', 5);
    await writeMeta(db, 'newCardsSinceBackup', 2);
    await writeMeta(db, 'newCardsSinceBackup', 3);
    expect(await readMeta(db)).toEqual({ onboardedAt: 5, newCardsSinceBackup: 3 });
  });
});
