/**
 * Direkter IndexedDB-Zugriff für den Geräte-Check (Blob-Test, Marker).
 * Die eigentliche Datenhaltung kommt in M1 über Dexie (data/); dieser Test bleibt bewusst
 * ohne Bibliothek, damit er misst, was der Browser selbst kann.
 */

const STORE = 'probe';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'));
  });
}

export function openProbeDb(name: string): Promise<IDBDatabase> {
  const req = indexedDB.open(name, 1);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
  };
  return request(req);
}

async function withStore<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const tx = db.transaction(STORE, mode);
  const result = await request(run(tx.objectStore(STORE)));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Transaktion fehlgeschlagen'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaktion abgebrochen'));
  });
  return result;
}

export function putValue(db: IDBDatabase, key: string, value: unknown): Promise<IDBValidKey> {
  return withStore(db, 'readwrite', (s) => s.put(value, key));
}

export function getValue(db: IDBDatabase, key: string): Promise<unknown> {
  return withStore(db, 'readonly', (s) => s.get(key));
}

export function deleteValue(db: IDBDatabase, key: string): Promise<undefined> {
  return withStore(db, 'readwrite', (s) => s.delete(key));
}

export interface BlobRoundtrip {
  bytes: number;
  writeMs: number;
  readMs: number;
  intact: boolean;
}

/** Schreibt einen Blob der gewünschten Größe, liest ihn zurück, prüft Stichproben und löscht ihn. */
export async function blobRoundtrip(dbName: string, bytes: number): Promise<BlobRoundtrip> {
  const data = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i += 4096) data[i] = i % 251;
  const blob = new Blob([data], { type: 'application/octet-stream' });

  const db = await openProbeDb(dbName);
  try {
    const t0 = performance.now();
    await putValue(db, 'blob', blob);
    const t1 = performance.now();
    const stored = await getValue(db, 'blob');
    const t2 = performance.now();
    let intact = false;
    if (stored instanceof Blob && stored.size === bytes) {
      const back = new Uint8Array(await stored.arrayBuffer());
      intact = true;
      for (let i = 0; i < bytes; i += 4096 * 97) {
        if (back[i] !== i % 251) intact = false;
      }
    }
    await deleteValue(db, 'blob');
    return { bytes, writeMs: t1 - t0, readMs: t2 - t1, intact };
  } finally {
    db.close();
  }
}
