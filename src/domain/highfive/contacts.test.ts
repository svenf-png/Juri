import { describe, expect, it } from 'vitest';
import { MAX_CELEBRATED, type Contact } from '../model/records';
import {
  contactInitial,
  contactName,
  nameList,
  renameContact,
  sortContacts,
  withCelebrated,
} from './contacts';

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'k1',
  sentName: 'Mara',
  firstSeenAt: 1,
  lastSeenAt: 10,
  celebrated: [],
  ...over,
});

describe('Kontakte', () => {
  it('der eigene Name gewinnt gegen den gesendeten', () => {
    expect(contactName(contact())).toBe('Mara');
    expect(contactName(contact({ alias: 'Mara aus der AG' }))).toBe('Mara aus der AG');
    expect(contactInitial(contact({ sentName: 'ärzte' }))).toBe('Ä');
  });

  it('Umbenennen räumt auf: Leerraum zusammen, leer oder gleich nimmt den eigenen Namen weg', () => {
    const renamed = renameContact(contact(), '  Mara   Müller ');
    expect(renamed.alias).toBe('Mara Müller');
    expect(renameContact(renamed, '   ').alias).toBeUndefined();
    expect(renameContact(renamed, 'Mara').alias).toBeUndefined();
    expect(renameContact(contact(), 'x'.repeat(100)).alias).toHaveLength(40);
  });

  it('sortiert nach zuletzt gesehen, dann Name, dann ID', () => {
    const list = [
      contact({ id: 'c', sentName: 'Zoe', lastSeenAt: 5 }),
      contact({ id: 'b', sentName: 'Anna', lastSeenAt: 5 }),
      contact({ id: 'a', sentName: 'Anna', lastSeenAt: 5 }),
      contact({ id: 'd', sentName: 'Bob', lastSeenAt: 9 }),
    ];
    expect(sortContacts(list).map((c) => c.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('merkt gefeierte Schlüssel einmal und höchstens so viele wie erlaubt', () => {
    expect(withCelebrated(['a'], 'a')).toEqual(['a']);
    const full = Array.from({ length: MAX_CELEBRATED }, (_, i) => `k${String(i)}`);
    const next = withCelebrated(full, 'neu');
    expect(next).toHaveLength(MAX_CELEBRATED);
    expect(next.at(-1)).toBe('neu');
    expect(next[0]).toBe('k1');
  });

  it('Namensliste', () => {
    expect(nameList([])).toBe('');
    expect(nameList(['Mara'])).toBe('Mara');
    expect(nameList(['Mara', 'Jonas'])).toBe('Mara und Jonas');
    expect(nameList(['Mara', 'Jonas', 'Lea'])).toBe('Mara, Jonas und Lea');
    expect(nameList(['Mara', 'Jonas', 'Lea', 'Tim'])).toBe('Mara, Jonas und 2 weitere');
  });
});
