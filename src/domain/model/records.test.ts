import { describe, expect, it } from 'vitest';
import { DEVICE_META_KEYS, RECORD_SCHEMAS, metaEntrySchema, profileSchema } from './records';

describe('profileSchema', () => {
  const profile = { id: 'me', name: 'Sven', createdAt: 1, updatedAt: 2 };

  it('akzeptiert ein gültiges Profil', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it.each([
    ['leerer Name', { ...profile, name: '' }],
    ['Name nicht bereinigt', { ...profile, name: ' Sven ' }],
    ['andere ID', { ...profile, id: 'du' }],
    ['negative Zeit', { ...profile, createdAt: -1 }],
    ['unbekanntes Feld', { ...profile, admin: true }],
  ])('lehnt ab: %s', (_, value) => {
    expect(profileSchema.safeParse(value).success).toBe(false);
  });
});

describe('metaEntrySchema', () => {
  it('kennt jeden Schlüssel mit eigenem Werttyp', () => {
    expect(metaEntrySchema.safeParse({ key: 'onboardedAt', value: 5 }).success).toBe(true);
    expect(metaEntrySchema.safeParse({ key: 'newCardsSinceBackup', value: 3 }).success).toBe(true);
    expect(metaEntrySchema.safeParse({ key: 'newCardsSinceBackup', value: 1.5 }).success).toBe(
      false,
    );
    expect(metaEntrySchema.safeParse({ key: 'unbekannt', value: 1 }).success).toBe(false);
  });
});

describe('Tabellen', () => {
  it('haben je ein Schema; Gerätedaten sind Metadaten-Schlüssel', () => {
    expect(Object.keys(RECORD_SCHEMAS)).toEqual([
      'profile',
      'meta',
      'areas',
      'decks',
      'cards',
      'reviewItems',
      'reviewLog',
      'events',
    ]);
    for (const key of DEVICE_META_KEYS) {
      expect(metaEntrySchema.safeParse({ key, value: 0 }).success).toBe(true);
    }
  });
});
