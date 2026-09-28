import type { MetaKey, MetaValues, Profile } from '@/domain/model/records';
import { normalizeName } from '@/domain/profile/name';
import type { JuriDb } from '../db';

export async function readProfile(db: JuriDb): Promise<Profile | null> {
  return (await db.profile.get('me')) ?? null;
}

/**
 * Legt das Profil an oder benennt es um; der Name muss bereinigt sein (normalizeName).
 * Bewusst ohne zod, damit zod erst mit dem Backup geladen wird (kleinerer Start-Download).
 */
export async function writeProfileName(db: JuriDb, name: string, now: number): Promise<Profile> {
  if (name === '' || name !== normalizeName(name)) throw new TypeError('Name ist nicht bereinigt');
  return db.transaction('rw', db.profile, async () => {
    const current = await db.profile.get('me');
    const profile: Profile = current
      ? { ...current, name, updatedAt: now }
      : { id: 'me', name, createdAt: now, updatedAt: now };
    await db.profile.put(profile);
    return profile;
  });
}

export async function readMeta(db: JuriDb): Promise<Partial<MetaValues>> {
  const entries = await db.meta.toArray();
  return Object.fromEntries(entries.map((e) => [e.key, e.value]));
}

export async function writeMeta<K extends MetaKey>(
  db: JuriDb,
  key: K,
  value: MetaValues[K],
): Promise<void> {
  await db.meta.put({ key, value });
}
