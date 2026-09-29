import { describe, expect, it } from 'vitest';
import { decodeBackup } from '@/domain/backup/codec';
import { checkCard, type CardFields } from '@/domain/cards/card';
import type { MediaRecord } from '@/domain/model/records';
import { exportBackup, prepareRestore, restoreBackup } from '../backup';
import { MIGRATIONS } from '../migrations';
import { testDb } from '../testDb';
import { createArea } from './areas';
import { createCard, deleteCard, readCard, updateCard } from './cards';
import { createDeck, deleteDeck } from './decks';
import { isMediaUsed, mediaTotals, readMedia, releaseMedia } from './media';
import { writeProfileName } from './profile';

const T = new Date(2026, 9, 1, 10).getTime();

const image = (id: string, bytes = [1, 2, 3]): MediaRecord => ({
  id,
  kind: 'image',
  mime: 'image/jpeg',
  name: `${id}.jpg`,
  size: bytes.length,
  width: 100,
  height: 50,
  createdAt: T,
  data: Uint8Array.from(bytes).buffer,
});

const pdf = (id: string): MediaRecord => ({
  id,
  kind: 'pdf',
  mime: 'application/pdf',
  name: 'Skript.pdf',
  size: 4,
  pages: 62,
  createdAt: T,
  data: Uint8Array.from([37, 80, 68, 70]).buffer,
});

function coverFields(mediaId: string, source?: CardFields['source']): CardFields {
  const result = checkCard({
    type: 'cover',
    front: '',
    back: '',
    text: '',
    mediaId,
    masks: [
      { n: 1, x: 0.1, y: 0.1, w: 0.3, h: 0.1 },
      { n: 2, x: 0.5, y: 0.5, w: 0.3, h: 0.1 },
    ],
    source,
    norm: '',
    tags: '',
    note: '',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.fields;
}

function qaFields(source?: CardFields['source']): CardFields {
  const result = checkCard({
    type: 'qa',
    front: 'Frage?',
    back: 'Antwort.',
    text: '',
    source,
    norm: '',
    tags: '',
    note: '',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.fields;
}

async function setup() {
  const { db, reopen } = testDb();
  await writeProfileName(db, 'Sven', T);
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
  await createDeck(db, { id: 'sr', name: 'Sachenrecht', norm: '', areaIds: ['zr'] }, T);
  await createDeck(db, { id: 'er', name: 'Erbrecht', norm: '', areaIds: ['zr'] }, T);
  return { db, reopen };
}

describe('Medien speichern und löschen', () => {
  it('speichert Bild und Abdeckung mit einer Abfrage je Feld', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    expect((await db.reviewItems.toArray()).map((i) => i.id).sort()).toEqual(['k1:m1', 'k1:m2']);
    const media = await readMedia(db, 'i1');
    expect(new Uint8Array(media?.data ?? new ArrayBuffer(0))).toEqual(Uint8Array.from([1, 2, 3]));
    expect(await readMedia(db, 'fehlt')).toBeNull();
    expect(await mediaTotals(db)).toEqual({ count: 1, bytes: 3 });
    expect(await isMediaUsed(db, 'i1')).toBe(true);
  });

  it('löscht das Bild mit der Karte', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    expect(await deleteCard(db, 'k1')).toBe(2);
    expect(await readMedia(db, 'i1')).toBeNull();
  });

  it('behält ein PDF, bis die letzte Karte mit dieser Herkunft geht', async () => {
    const { db } = await setup();
    const source = { name: 'Skript.pdf', page: 14, mediaId: 'p1' };
    await createCard(
      db,
      { id: 'a', deckId: 'sr', fields: qaFields(source), media: [pdf('p1')] },
      T,
    );
    await createCard(db, { id: 'b', deckId: 'sr', fields: qaFields({ ...source, page: 15 }) }, T);
    await deleteCard(db, 'a');
    expect(await readMedia(db, 'p1')).not.toBeNull();
    await deleteCard(db, 'b');
    expect(await readMedia(db, 'p1')).toBeNull();
  });

  it('räumt beim Löschen eines Stapels alle ungenutzten Medien weg', async () => {
    const { db } = await setup();
    const source = { name: 'Skript.pdf', page: 1, mediaId: 'p1' };
    await createCard(
      db,
      { id: 'a', deckId: 'sr', fields: qaFields(source), media: [pdf('p1')] },
      T,
    );
    await createCard(
      db,
      { id: 'c', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    await createCard(db, { id: 'd', deckId: 'er', fields: qaFields(source) }, T);
    await deleteDeck(db, 'sr');
    expect(await readMedia(db, 'i1')).toBeNull();
    // Das PDF wird von einer Karte im anderen Stapel noch genutzt.
    expect(await readMedia(db, 'p1')).not.toBeNull();
    await deleteDeck(db, 'er');
    expect(await mediaTotals(db)).toEqual({ count: 0, bytes: 0 });
  });

  it('gibt beim Bearbeiten die Felder neu ab, ohne das Bild anzutasten', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    const edited = checkCard({
      type: 'cover',
      front: '',
      back: '',
      text: '',
      mediaId: 'i1',
      masks: [{ n: 2, x: 0.5, y: 0.5, w: 0.3, h: 0.1 }],
      norm: '',
      tags: '',
      note: '',
    });
    if (!edited.ok) throw new Error('ungültig');
    await updateCard(db, 'k1', { deckId: 'sr', fields: edited.fields }, T + 1);
    expect((await db.reviewItems.toArray()).map((i) => i.id)).toEqual(['k1:m2']);
    expect(await readMedia(db, 'i1')).not.toBeNull();
  });

  it('releaseMedia löscht nur, was ungenutzt ist', async () => {
    const { db } = await setup();
    await db.media.bulkAdd([image('lose')]);
    expect(await releaseMedia(db, ['lose', 'lose', 'fehlt'])).toEqual(['lose', 'fehlt']);
    expect(await db.media.count()).toBe(0);
  });

  it('findet Karten über die Indizes auf den Verweisen', async () => {
    const { db } = await setup();
    const source = { name: 'Skript.pdf', page: 1, mediaId: 'p1' };
    await createCard(
      db,
      { id: 'a', deckId: 'sr', fields: qaFields(source), media: [pdf('p1')] },
      T,
    );
    expect(await db.cards.where('source.mediaId').equals('p1').primaryKeys()).toEqual(['a']);
    expect((await readCard(db, 'a'))?.source).toEqual(source);
  });
});

describe('Backup mit Medien', () => {
  it('sichert und spielt Bilder und PDFs unverändert ein', async () => {
    const { db } = await setup();
    const source = { name: 'Skript.pdf', page: 14, mediaId: 'p1' };
    await createCard(
      db,
      { id: 'a', deckId: 'sr', fields: qaFields(source), media: [pdf('p1')] },
      T,
    );
    await createCard(
      db,
      {
        id: 'c',
        deckId: 'sr',
        fields: coverFields('i1', { name: 'Skript.pdf', page: 14 }),
        media: [image('i1', [9, 8, 7, 6])],
      },
      T,
    );
    const file = await exportBackup(db, T, { instance: 'test', version: '0.7.0' });
    const target = (await setup()).db;
    await restoreBackup(target, decodeBackup(file));
    const back = await readMedia(target, 'i1');
    expect(back).toMatchObject({ kind: 'image', size: 4, width: 100 });
    expect(new Uint8Array(back?.data ?? new ArrayBuffer(0))).toEqual(Uint8Array.from([9, 8, 7, 6]));
    expect((await readMedia(target, 'p1'))?.pages).toBe(62);
    expect((await readCard(target, 'c'))?.type).toBe('cover');
  });

  it('lehnt ein Backup ab, dem das Bild einer Abdeckung fehlt', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'c', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    const content = decodeBackup(await exportBackup(db, T, { instance: 'test', version: '0.7.0' }));
    expect(() =>
      prepareRestore({ ...content, tables: { ...content.tables, media: [] } }),
    ).toThrow();
    expect(() => prepareRestore(content)).not.toThrow();
  });

  it('lehnt ein Medium mit ungültigem Aufbau ab', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'c', deckId: 'sr', fields: coverFields('i1'), media: [image('i1')] },
      T,
    );
    const content = decodeBackup(await exportBackup(db, T, { instance: 'test', version: '0.7.0' }));
    const bad = {
      ...content.tables,
      media: [{ ...(content.tables.media?.[0] ?? {}), data: 'kein Puffer' }],
    };
    expect(() => prepareRestore({ ...content, tables: bad })).toThrow();
  });
});

describe('Version 5 (M6)', () => {
  it('hebt eine Datenbank aus M5 an: Karten bleiben, Medien sind leer', async () => {
    const { db, reopen } = testDb(MIGRATIONS.slice(0, 4));
    await db.cards.add({
      id: 'q',
      deckId: 'd',
      type: 'qa' as const,
      front: 'F',
      back: 'B',
      norm: '',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    });
    db.close();
    const upgraded = reopen(MIGRATIONS);
    expect(await upgraded.cards.count()).toBe(1);
    expect(await upgraded.media.count()).toBe(0);
    expect(await upgraded.cards.where('mediaId').equals('x').count()).toBe(0);
  });
});
