/**
 * Gespeicherte Datensätze (IndexedDB über Dexie, src/data/). Die zod-Schemas sind die einzige
 * Quelle der Typen und prüfen Datensätze beim Einspielen eines Backups.
 *
 * Stand M1: Profil und Metadaten. Die übrigen Tabellen des Zielmodells (ADR-006) kommen mit
 * ihren Meilensteinen dazu, jeweils mit Schema und Migration. Zeitpunkte sind Millisekunden
 * seit 1970 (UTC).
 */
import { normalizeName } from '../profile/name';
import { z } from '../zod';

const millis = z.number().int().nonnegative();

export const profileSchema = z.strictObject({
  id: z.literal('me'),
  name: z.string().refine((name) => name !== '' && name === normalizeName(name)),
  createdAt: millis,
  updatedAt: millis,
});

/** Profil der Person, die Juri auf diesem Gerät nutzt; genau ein Datensatz. */
export type Profile = z.infer<typeof profileSchema>;

export const metaEntrySchema = z.discriminatedUnion('key', [
  /** Onboarding abgeschlossen. */
  z.strictObject({ key: z.literal('onboardedAt'), value: millis }),
  /** Letztes erstelltes oder eingespieltes Backup. */
  z.strictObject({ key: z.literal('lastBackupAt'), value: millis }),
  /** Neue Karten seit dem letzten Backup (Backup-Erinnerung, gezählt ab M3). */
  z.strictObject({ key: z.literal('newCardsSinceBackup'), value: z.number().int().nonnegative() }),
]);

export type MetaEntry = z.infer<typeof metaEntrySchema>;
export type MetaKey = MetaEntry['key'];
export type MetaValues = { [E in MetaEntry as E['key']]: E['value'] };

/**
 * Metadaten, die nur dieses Gerät betreffen und deshalb nicht ins Backup gehören.
 * Beim Einspielen setzt Juri sie neu: letztes Backup = Zeitpunkt der Datei.
 */
export const DEVICE_META_KEYS: readonly MetaKey[] = ['lastBackupAt', 'newCardsSinceBackup'];

/** Schema je Tabelle; jede Tabelle der Datenbank braucht hier einen Eintrag. */
export const RECORD_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  profile: profileSchema,
  meta: metaEntrySchema,
};
