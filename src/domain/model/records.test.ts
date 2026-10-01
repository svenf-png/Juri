import { describe, expect, it } from 'vitest';
import {
  dayStatSchema,
  deadlineSchema,
  DEVICE_META_KEYS,
  RECORD_SCHEMAS,
  metaEntrySchema,
  milestoneSchema,
  profileSchema,
} from './records';

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
      'media',
      'deadlines',
      'dayStats',
      'milestones',
      'contacts',
      'kudos',
    ]);
    for (const key of DEVICE_META_KEYS) {
      expect(metaEntrySchema.safeParse({ key, value: 0 }).success).toBe(true);
    }
  });
});

describe('Fristen (M8)', () => {
  const scope = { all: false, areaIds: ['zr'], deckIds: [], tags: ['LLM'] };
  const deadline = {
    id: 'f1',
    kind: 'klausur',
    name: 'Klausur ZR',
    date: '2026-10-09',
    scope,
    sprint: true,
    createdAt: 1,
    updatedAt: 1,
  };
  const ok = (value: unknown) => deadlineSchema.safeParse(value).success;

  it('nehmen Frist mit und ohne Datum an', () => {
    expect(ok(deadline)).toBe(true);
    const undated: Partial<typeof deadline> = { ...deadline };
    delete undated.date;
    expect(ok(undated)).toBe(true);
  });

  it('lehnen ungültige Tage, Arten und fremde Felder ab', () => {
    expect(ok({ ...deadline, date: '2026-02-31' })).toBe(false);
    expect(ok({ ...deadline, date: '9.10.2026' })).toBe(false);
    expect(ok({ ...deadline, kind: 'pruefung' })).toBe(false);
    expect(ok({ ...deadline, name: ' Klausur' })).toBe(false);
    expect(ok({ ...deadline, extra: 1 })).toBe(false);
  });

  it('erlauben „alle“ nur ohne weitere Angaben und keine doppelten Einträge', () => {
    expect(ok({ ...deadline, scope: { all: true, areaIds: [], deckIds: [], tags: [] } })).toBe(
      true,
    );
    expect(ok({ ...deadline, scope: { ...scope, all: true } })).toBe(false);
    expect(ok({ ...deadline, scope: { ...scope, areaIds: ['zr', 'zr'] } })).toBe(false);
    expect(ok({ ...deadline, scope: { ...scope, tags: ['a b'] } })).toBe(false);
    // Ein leerer Umfang ist erlaubt: Er entsteht, wenn Löschen die letzten Verweise entfernt.
    expect(ok({ ...deadline, scope: { all: false, areaIds: [], deckIds: [], tags: [] } })).toBe(
      true,
    );
  });
});

describe('Fortschritt (M9)', () => {
  it('Tagesaggregat: gültiger Tag, keine negativen Zahlen', () => {
    const ok = { day: '2026-09-28', reviews: 3, learned: 2, created: 0, met: false };
    expect(dayStatSchema.safeParse(ok).success).toBe(true);
    expect(dayStatSchema.safeParse({ ...ok, day: '2026-02-31' }).success).toBe(false);
    expect(dayStatSchema.safeParse({ ...ok, reviews: -1 }).success).toBe(false);
    expect(dayStatSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });

  it('Meilenstein und Ziele', () => {
    expect(milestoneSchema.safeParse({ id: 'serie-7', unlockedAt: 5, seen: false }).success).toBe(
      true,
    );
    expect(milestoneSchema.safeParse({ id: '', unlockedAt: 5, seen: false }).success).toBe(false);
    expect(
      metaEntrySchema.safeParse({ key: 'goals', value: { learn: 24, create: 5, pause: true } })
        .success,
    ).toBe(true);
    expect(
      metaEntrySchema.safeParse({ key: 'goals', value: { learn: 0, create: 5, pause: true } })
        .success,
    ).toBe(false);
  });
});
