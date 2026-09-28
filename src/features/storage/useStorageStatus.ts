import { useCallback, useEffect, useState } from 'react';
import {
  readStorageStatus,
  requestPersistentStorage,
  type StorageStatus,
} from '@/platform/storage';

/** Speicherstatus für die Einstellungen: dauerhaft gespeichert, belegt, verfügbar. */
export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null);

  const refresh = useCallback(() => {
    void readStorageStatus(navigator.storage).then(setStatus);
  }, []);

  useEffect(refresh, [refresh]);

  const request = useCallback(async () => {
    await requestPersistentStorage(navigator.storage);
    refresh();
  }, [refresh]);

  return { status, request };
}
