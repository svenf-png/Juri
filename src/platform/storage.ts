/** Speicherstatus über die Storage API (persist, estimate). */

export interface StorageStatus {
  supported: boolean;
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}

type StorageLike = Pick<StorageManager, 'persisted' | 'persist' | 'estimate'>;

export async function readStorageStatus(storage: StorageLike | undefined): Promise<StorageStatus> {
  if (!storage) return { supported: false, persisted: null, usage: null, quota: null };
  const [persisted, estimate] = await Promise.all([
    storage.persisted().catch(() => null),
    storage.estimate().catch(() => null),
  ]);
  return {
    supported: true,
    persisted,
    usage: estimate?.usage ?? null,
    quota: estimate?.quota ?? null,
  };
}

/** Fordert dauerhaften Speicher an. WebKit entscheidet heuristisch (u. a. Home-Bildschirm-App). */
export async function requestPersistentStorage(
  storage: StorageLike | undefined,
): Promise<boolean | null> {
  if (!storage) return null;
  try {
    return await storage.persist();
  } catch {
    return null;
  }
}
