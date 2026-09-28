/** Testdaten-Menü, nur in der Testinstanz (Entscheidung 10). */
import { replaceTables } from '@/data/backup';
import { demoTables } from '@/demo/demoProfile';
import { database } from '../app/database';

export async function loadDemoProfile(now = Date.now()): Promise<void> {
  await replaceTables(database(), demoTables(now));
}

export async function resetAllData(): Promise<void> {
  await replaceTables(database(), {});
}
