import { readLibrary } from '@/data/repositories/library';
import { readMeta } from '@/data/repositories/profile';
import { useLive } from '../library/useLive';

const readShareSnapshot = async (db: Parameters<typeof readLibrary>[0]) => {
  const [library, meta] = await Promise.all([readLibrary(db), readMeta(db)]);
  return { library, achievements: meta.shareAchievements ?? true };
};

/** Stapel, Rechtsgebiete und die gespeicherte Wahl „Erfolge mitschicken“ für Teilen. */
export function useShareSnapshot() {
  const data = useLive('share', readShareSnapshot);
  return {
    snapshot: data.status === 'ready' ? data.value : null,
    failed: data.status === 'error',
  };
}
