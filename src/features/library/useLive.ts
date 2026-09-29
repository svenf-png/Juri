import { useEffect, useState } from 'react';
import type { JuriDb } from '@/data/db';
import { observe } from '@/data/live';
import { database } from '../app/database';

export type Live<T> =
  { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: unknown };

/**
 * Abfrage an die Datenbank, die sich bei jeder Änderung der beteiligten Tabellen erneuert
 * (Dexie liveQuery). `key` benennt die Abfrage samt Parametern: Wechselt er, gilt das alte
 * Ergebnis nicht mehr. `query` muss zum Schlüssel passen und stabil sein (useCallback).
 * Mit `enabled = false` läuft nichts.
 */
export function useLive<T>(
  key: string,
  query: (db: JuriDb) => Promise<T>,
  enabled = true,
): Live<T> {
  const [result, setResult] = useState<{ key: string; live: Live<T> } | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    return observe(
      () => query(database()),
      (value) => {
        setResult({ key, live: { status: 'ready', value } });
      },
      (error: unknown) => {
        setResult({ key, live: { status: 'error', error } });
      },
    );
  }, [key, query, enabled]);
  return result?.key === key ? result.live : { status: 'loading' };
}
