import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { JuriDb } from './db';
import type { Migration } from './migrations';

/** Nur für Tests: Datenbank in einer eigenen, flüchtigen IndexedDB (fake-indexeddb). */
export function testDb(migrations?: readonly Migration[], factory = new IDBFactory()) {
  const open = (list = migrations) =>
    new JuriDb('juri-test', { indexedDB: factory, IDBKeyRange }, list);
  return { db: open(), reopen: open };
}
