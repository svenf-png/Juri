import { BUILD } from '@/app/build';
import {
  ensureSenderId,
  giveHighFive,
  markSeen,
  planSocial,
  removeContact,
  renameContactRecord,
  writeSocial,
} from '@/data/repositories/highfive';
import { readAchievements } from '@/data/repositories/juri';
import { readMeta, readProfile } from '@/data/repositories/profile';
import { cardSentence, type CardContent } from '@/domain/highfive/card';
import type { Win } from '@/domain/highfive/wins';
import { socialFromManifest, type ReceivePlan } from '@/domain/highfive/incoming';
import { buildGreeting, greetingFileName } from '@/domain/juri/build';
import { decodeGreeting, encodeGreeting } from '@/domain/juri/codec';
import { JURI_LIMITS, JURI_MIME, JuriError, type GreetingManifest } from '@/domain/juri/format';
import type { Kudo } from '@/domain/model/records';
import { renderCardPng } from '@/platform/canvas';
import { newId } from '@/platform/id';
import { database } from '../app/database';
import { deliverFile, type DeliverOutcome } from '../share/deliver';

/** Gibt ein High five; `null`, wenn dem Kontakt heute schon eines ging. */
export function give(contactId: string, win: Win | undefined): Promise<Kudo | null> {
  return giveHighFive(database(), { contactId, win, now: Date.now(), newId });
}

export function acknowledge(ids: readonly string[]): Promise<void> {
  return markSeen(database(), ids);
}

export function renameContact(id: string, name: string): Promise<void> {
  return renameContactRecord(database(), id, name);
}

export function deleteContact(id: string): Promise<void> {
  return removeContact(database(), id);
}

/** Bildkarte als PNG-Datei; entsteht vor dem Tippen auf „Teilen“, damit das Teilen direkt folgen kann. */
export async function prepareCard(
  content: Omit<CardContent, 'from'>,
): Promise<{ file: File; alt: string; url: string }> {
  const profile = await readProfile(database());
  const full: CardContent = { ...content, from: profile?.name ?? 'Juri' };
  const { blob, alt } = await renderCardPng(full);
  const file = new File([blob], 'High five.png', { type: 'image/png', lastModified: Date.now() });
  return { file, alt, url: URL.createObjectURL(blob) };
}

/** Gruß-Datei für ein gegebenes High five (Absender-ID wird beim ersten Mal erzeugt). */
export async function prepareGreeting(kudo: Kudo, now = Date.now()): Promise<File> {
  const db = database();
  const [senderId, profile, meta] = await Promise.all([
    ensureSenderId(db, newId),
    readProfile(db),
    readMeta(db),
  ]);
  const achievements = (meta.shareAchievements ?? true) ? await readAchievements(db, now) : null;
  const manifest = buildGreeting({
    senderId,
    senderName: profile?.name ?? 'Juri',
    achievements,
    highFives: [
      {
        id: kudo.id,
        at: kudo.at,
        to: kudo.contactId,
        ...(kudo.win !== undefined ? { win: kudo.win } : {}),
      },
    ],
    now,
    appVersion: BUILD.version,
  });
  return new File([encodeGreeting(manifest)], greetingFileName(manifest.sender.name), {
    type: JURI_MIME,
    lastModified: now,
  });
}

export function sendFile(file: File): Promise<DeliverOutcome> {
  return deliverFile(file);
}

/** Liest und prüft eine gewählte Gruß-Datei vollständig; wirft `JuriError`. */
export async function readGreeting(file: File): Promise<GreetingManifest> {
  if (file.size > JURI_LIMITS.maxManifestBytes * 4) throw new JuriError('zu-gross');
  return decodeGreeting(new Uint8Array(await file.arrayBuffer()));
}

/** Was die Datei bringen würde, gerechnet auf dem heutigen Stand, ohne zu schreiben. */
export function previewGreeting(
  manifest: GreetingManifest,
  now = Date.now(),
): Promise<ReceivePlan> {
  return planSocial(database(), socialFromManifest(manifest), now);
}

/** Nimmt die Gruß-Datei an: Kontakt und High fives in einer Transaktion. */
export async function acceptGreeting(
  manifest: GreetingManifest,
  now = Date.now(),
): Promise<ReceivePlan> {
  const db = database();
  return db.transaction('rw', [db.contacts, db.kudos, db.meta], async () => {
    const plan = await planSocial(db, socialFromManifest(manifest), now);
    await writeSocial(db, plan);
    return plan;
  });
}

export { cardSentence };
