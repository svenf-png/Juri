import { writeMeta, writeProfileName } from '@/data/repositories/profile';
import { normalizeName } from '@/domain/profile/name';
import { requestPersistentStorage } from '@/platform/storage';
import { database } from '../app/database';

/** Legt das Profil an und fordert danach dauerhaften Speicher an (ADR-002). */
export async function completeOnboarding(rawName: string, now = Date.now()): Promise<void> {
  const db = database();
  await db.transaction('rw', db.profile, db.meta, async () => {
    await writeProfileName(db, normalizeName(rawName), now);
    await writeMeta(db, 'onboardedAt', now);
  });
  void requestPersistentStorage(navigator.storage);
}

export async function renameProfile(rawName: string, now = Date.now()): Promise<void> {
  await writeProfileName(database(), normalizeName(rawName), now);
}
