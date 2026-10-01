import { describe, expect, it, vi } from 'vitest';
import { decodeBackup } from '@/domain/backup/codec';
import { checkCard } from '@/domain/cards/card';
import { socialFromManifest } from '@/domain/highfive/incoming';
import { winsOf } from '@/domain/highfive/wins';
import { buildPackage } from '@/domain/juri/build';
import { decodeJuri, encodeJuri } from '@/domain/juri/codec';
import type { HighFive } from '@/domain/juri/format';
import { planMerge } from '@/domain/juri/merge';
import { exportBackup, prepareRestore, restoreBackup } from '../backup';
import { testDb } from '../testDb';
import { createArea } from './areas';
import { createCard } from './cards';
import { createDeck } from './decks';
import {
  ensureSenderId,
  giveHighFive,
  markSeen,
  readHighFives,
  readSenderId,
  removeContact,
  renameContactRecord,
} from './highfive';
import { applyMerge, readExportSource, readMergeLocal } from './juri';
import { readErfolge } from './progress';
import { writeProfileName } from './profile';

/** 10:00 Ortszeit, außerhalb von 0 bis 4 Uhr. */
const at = (day: number) => new Date(2026, 8, day, 10, 0).getTime();
const T = at(20);
const NOW = at(29);
const app = { instance: 'test', version: '0.12.0' } as const;
type Db = ReturnType<typeof testDb>['db'];

let counter = 0;
const newId = () => `id-${String(++counter)}`;

async function sender(): Promise<Db> {
  const { db } = testDb();
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
  await createDeck(db, { id: 'deck-a', name: 'Amtshaftung', norm: '', areaIds: ['zr'] }, T);
  const form = checkCard({
    type: 'qa',
    front: 'F?',
    back: 'A.',
    text: '',
    norm: '',
    tags: '',
    note: '',
  });
  if (!form.ok) throw new Error('Karte');
  await createCard(db, { id: 'c1', deckId: 'deck-a', fields: form.fields }, T);
  return db;
}

async function recipient(): Promise<Db> {
  const { db } = testDb();
  await writeProfileName(db, 'Sven', T);
  return db;
}

async function fileFrom(
  db: Db,
  highFives: HighFive[],
  over: { senderId?: string | undefined; achievements?: boolean } = {},
) {
  const source = await readExportSource(db, ['deck-a']);
  const { pack } = buildPackage(source, {
    deckIds: ['deck-a'],
    notes: false,
    achievements:
      over.achievements === false
        ? null
        : { streak: 12, reviews: 300, created: 40, milestones: ['erste-karte'] },
    highFives,
    senderName: 'Mara',
    senderId: 'senderId' in over ? over.senderId : 'mara-1',
    now: at(28),
    appVersion: '0.12.0',
  });
  return decodeJuri(encodeJuri(pack));
}

async function importPack(db: Db, pack: Awaited<ReturnType<typeof fileFrom>>, now = NOW) {
  const plan = planMerge({
    pack,
    local: await readMergeLocal(db, pack),
    mode: 'update',
    now,
    newId,
  });
  return applyMerge(db, plan, now, socialFromManifest(pack.manifest));
}

describe('Absender-ID', () => {
  it('entsteht einmal und bleibt, auch bei gleichzeitigen Aufrufen', async () => {
    const { db } = testDb();
    expect(await readSenderId(db)).toBeUndefined();
    const ids = await Promise.all([ensureSenderId(db, newId), ensureSenderId(db, newId)]);
    expect(ids[0]).toBe(ids[1]);
    expect(await readSenderId(db)).toBe(ids[0]);
    expect(await ensureSenderId(db, () => 'anders')).toBe(ids[0]);
  });
});

describe('Import mit Kontakt und High fives', () => {
  it('schreibt Karten, Kontakt und High five in einer Transaktion, ohne Tagesziel oder Serie zu verändern', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    const pack = await fileFrom(from, [
      { id: 'h1', at: at(28), to: 'ich-1', win: '12 Tage in Folge' },
    ]);
    const result = await importPack(db, pack);
    expect(result?.kudos).toHaveLength(1);
    expect(await db.cards.count()).toBe(1);
    expect(await db.contacts.get('mara-1')).toMatchObject({
      sentName: 'Mara',
      celebrated: ['m:erste-karte'],
    });
    expect(await db.kudos.get('h1')).toMatchObject({
      direction: 'received',
      contactId: 'mara-1',
      day: '2026-09-28',
      win: '12 Tage in Folge',
      seen: false,
    });
    // Keine neuen Ereignisse: Ein High five zählt nicht fürs Tagesziel.
    expect(await db.events.where('type').equals('cardImported').count()).toBe(1);
    expect(await db.events.count()).toBe(1);
    const erfolge = await readErfolge(db, { year: 2026, month: 9, day: 29 });
    expect(erfolge.metrics.created).toBe(0);
    // Backup-Roundtrip bleibt konsistent.
    const backup = decodeBackup(await exportBackup(db, NOW, app));
    expect(() => prepareRestore(backup, undefined)).not.toThrow();
  });

  it('derselbe Import ein zweites Mal ändert nichts', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    const pack = await fileFrom(from, [{ id: 'h1', at: at(28), to: 'ich-1' }]);
    await importPack(db, pack);
    const before = JSON.stringify([await db.contacts.toArray(), await db.kudos.toArray()]);
    const again = await importPack(db, pack, at(30));
    expect(again?.empty).toBe(true);
    expect(JSON.stringify([await db.contacts.toArray(), await db.kudos.toArray()])).toBe(before);
  });

  it('Datei ohne Absender-ID: Karten kommen, aber kein Kontakt und kein High five', async () => {
    const from = await sender();
    const db = await recipient();
    const pack = await fileFrom(from, [{ id: 'h1', at: at(28) }], { senderId: undefined });
    await importPack(db, pack);
    expect(await db.cards.count()).toBe(1);
    expect(await db.contacts.count()).toBe(0);
    expect(await db.kudos.count()).toBe(0);
  });

  it('High five von sich selbst kommt nicht an', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'mara-1');
    const pack = await fileFrom(from, [{ id: 'h1', at: at(28) }]);
    await importPack(db, pack);
    expect(await db.contacts.count()).toBe(0);
    expect(await db.kudos.count()).toBe(0);
  });

  it('Mitreise abgeschaltet beim Absender: Kontakt ohne Snapshot', async () => {
    const from = await sender();
    const db = await recipient();
    await importPack(db, await fileFrom(from, [{ id: 'h1', at: at(28) }], { achievements: false }));
    const contact = await db.contacts.get('mara-1');
    expect(contact?.snapshot).toBeUndefined();
    expect(await db.kudos.count()).toBe(0);
  });

  it('scheitert ein Schreibauftrag, bleibt alles unverändert (auch Karten und Kontakt)', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    const pack = await fileFrom(from, [{ id: 'h1', at: at(28), to: 'ich-1' }]);
    const spy = vi.spyOn(db.kudos, 'bulkAdd').mockRejectedValue(new Error('voll'));
    await expect(importPack(db, pack)).rejects.toThrow();
    spy.mockRestore();
    expect(await db.cards.count()).toBe(0);
    expect(await db.contacts.count()).toBe(0);
    expect(await db.kudos.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });

  it('nur Kontakt und High five, Karten unverändert: der Plan ist nicht leer, die Karten bleiben', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    await importPack(db, await fileFrom(from, []));
    const eventsBefore = await db.events.count();
    const pack = await fileFrom(from, [{ id: 'h9', at: at(28), to: 'ich-1' }]);
    const result = await importPack(db, pack, at(30));
    expect(result?.kudos).toHaveLength(1);
    expect(await db.events.count()).toBe(eventsBefore);
  });
});

describe('High five geben und verwalten', () => {
  async function withMara() {
    const from = await sender();
    const db = await recipient();
    await importPack(db, await fileFrom(from, []));
    return db;
  }

  it('gibt eines je Kontakt und Lerntag und merkt den gefeierten Erfolg', async () => {
    const db = await withMara();
    const mara = await db.contacts.get('mara-1');
    const win = winsOf(mara!.snapshot!.achievements)[0]!;
    const first = await giveHighFive(db, { contactId: 'mara-1', win, now: NOW, newId });
    expect(first).toMatchObject({ direction: 'given', contactId: 'mara-1', day: '2026-09-29' });
    expect((await db.contacts.get('mara-1'))?.celebrated).toContain(win.key);
    expect(
      await giveHighFive(db, { contactId: 'mara-1', win: undefined, now: NOW + 1000, newId }),
    ).toBeNull();
    expect(
      await giveHighFive(db, { contactId: 'mara-1', win: undefined, now: at(30), newId }),
    ).not.toBeNull();
    expect(
      await giveHighFive(db, { contactId: 'unbekannt', win: undefined, now: NOW, newId }),
    ).toBeNull();
  });

  it('markiert bekommene High fives als gesehen, benennt um und entfernt Kontakte samt High fives', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    await importPack(db, await fileFrom(from, [{ id: 'h1', at: at(28), to: 'ich-1' }]));
    await markSeen(db, ['h1', 'gibt-es-nicht']);
    expect((await db.kudos.get('h1'))?.seen).toBe(true);
    await renameContactRecord(db, 'mara-1', ' Mara   AG ');
    expect((await db.contacts.get('mara-1'))?.alias).toBe('Mara AG');
    await renameContactRecord(db, 'mara-1', '');
    expect((await db.contacts.get('mara-1'))?.alias).toBeUndefined();
    await removeContact(db, 'mara-1');
    expect(await readHighFives(db)).toEqual({ contacts: [], kudos: [] });
  });

  it('Backup: Kontakte und High fives überstehen den Roundtrip, ein High five ohne Kontakt wird abgelehnt', async () => {
    const from = await sender();
    const db = await recipient();
    await ensureSenderId(db, () => 'ich-1');
    await importPack(db, await fileFrom(from, [{ id: 'h1', at: at(28), to: 'ich-1' }]));
    const bytes = await exportBackup(db, NOW, app);
    const target = await recipient();
    await restoreBackup(target, decodeBackup(bytes));
    expect(await readHighFives(target)).toEqual(await readHighFives(db));
    expect(await readSenderId(target)).toBe('ich-1');
    await db.contacts.delete('mara-1');
    const broken = decodeBackup(await exportBackup(db, NOW, app));
    expect(() => prepareRestore(broken, undefined)).toThrow();
  });
});
