import { instanceById } from '@/app/instance';
import { JuriDb } from '@/data/db';

let db: JuriDb | undefined;

/** Datenbank dieser Instanz (`juri` oder `juri-test`); öffnet beim ersten Zugriff. */
export function database(): JuriDb {
  db ??= new JuriDb(instanceById(__JURI_INSTANCE__).dbName);
  return db;
}
