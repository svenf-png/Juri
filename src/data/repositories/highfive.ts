import { renameContact } from '@/domain/highfive/contacts';
import { planGive } from '@/domain/highfive/give';
import { planReceive, type ReceiveInput, type ReceivePlan } from '@/domain/highfive/incoming';
import type { Win } from '@/domain/highfive/wins';
import type { Contact, Kudo } from '@/domain/model/records';
import type { JuriDb } from '../db';

/** Alles, was die Bildschirme zu High fives brauchen: Kontakte und ihre High fives. */
export async function readHighFives(db: JuriDb): Promise<{ contacts: Contact[]; kudos: Kudo[] }> {
  const [contacts, kudos] = await Promise.all([db.contacts.toArray(), db.kudos.toArray()]);
  return { contacts, kudos };
}

/**
 * Absender-ID dieses Profils: zufällig, entsteht beim ersten Teilen und bleibt (ADR-015). Das
 * Anlegen läuft in einer Transaktion, damit zwei gleichzeitige Aufrufe dieselbe ID bekommen.
 */
export async function ensureSenderId(db: JuriDb, newId: () => string): Promise<string> {
  return db.transaction('rw', db.meta, async () => {
    const entry = await db.meta.get('senderId');
    if (entry?.key === 'senderId') return entry.value;
    const value = newId();
    await db.meta.put({ key: 'senderId', value });
    return value;
  });
}

export async function readSenderId(db: JuriDb): Promise<string | undefined> {
  const entry = await db.meta.get('senderId');
  return entry?.key === 'senderId' ? entry.value : undefined;
}

/**
 * Gibt ein High five: ein Kudo und der Kontakt (gefeierter Anlass) in einer Transaktion.
 * `null`, wenn dem Kontakt heute schon eines ging oder es ihn nicht gibt.
 */
export async function giveHighFive(
  db: JuriDb,
  input: { contactId: string; win: Win | undefined; now: number; newId: () => string },
): Promise<Kudo | null> {
  return db.transaction('rw', [db.contacts, db.kudos], async () => {
    const contact = await db.contacts.get(input.contactId);
    if (!contact) return null;
    const kudos = await db.kudos.where('contactId').equals(contact.id).toArray();
    const plan = planGive({ contact, win: input.win, kudos, now: input.now, newId: input.newId });
    if (!plan) return null;
    await db.kudos.add(plan.kudo);
    await db.contacts.put(plan.contact);
    return plan.kudo;
  });
}

/** Markiert bekommene High fives als gefeiert (Feier einmal). */
export async function markSeen(db: JuriDb, ids: readonly string[]): Promise<void> {
  await db.transaction('rw', db.kudos, async () => {
    const rows = (await db.kudos.bulkGet([...ids])).filter(
      (k): k is Kudo => k !== undefined && !k.seen,
    );
    if (rows.length > 0) await db.kudos.bulkPut(rows.map((k) => ({ ...k, seen: true })));
  });
}

export async function renameContactRecord(
  db: JuriDb,
  contactId: string,
  name: string,
): Promise<void> {
  await db.transaction('rw', db.contacts, async () => {
    const contact = await db.contacts.get(contactId);
    if (contact) await db.contacts.put(renameContact(contact, name));
  });
}

/** Entfernt einen Kontakt samt seinen High fives (kein Verweis ins Leere, ADR-006). */
export async function removeContact(db: JuriDb, contactId: string): Promise<void> {
  await db.transaction('rw', [db.contacts, db.kudos], async () => {
    await db.kudos.where('contactId').equals(contactId).delete();
    await db.contacts.delete(contactId);
  });
}

/** Was aus einer Datei für Kontakte und High fives kommt; der Rest folgt aus der Datenbank. */
export type IncomingSocial = Pick<
  ReceiveInput,
  'sender' | 'createdAt' | 'achievements' | 'highFives'
>;

/**
 * Plant die Aufnahme von Kontakt und High fives gegen den heutigen Stand der Datenbank. Muss in
 * einer Transaktion über `contacts`, `kudos` und `meta` laufen, wenn das Ergebnis gleich geschrieben wird.
 */
export async function planSocial(
  db: JuriDb,
  social: IncomingSocial,
  now: number,
): Promise<ReceivePlan> {
  const senderId = social.sender?.id;
  // Nacheinander lesen: Die Funktion läuft innerhalb einer Dexie-Transaktion (kein natives Promise.all).
  const ownId = await readSenderId(db);
  const contact = senderId ? await db.contacts.get(senderId) : undefined;
  const contactCount = await db.contacts.count();
  const knownIds = new Set(
    (await db.kudos.bulkGet(social.highFives.map((h) => h.id)))
      .filter((k): k is Kudo => k !== undefined)
      .map((k) => k.id),
  );
  const receivedDays = new Set(
    senderId
      ? (await db.kudos.where('contactId').equals(senderId).toArray())
          .filter((k) => k.direction === 'received')
          .map((k) => k.day)
      : [],
  );
  return planReceive({ ...social, ownId, contact, contactCount, knownIds, receivedDays, now });
}

/** Schreibt einen Plan; Aufrufer halten dafür schon eine Transaktion über `contacts` und `kudos`. */
export async function writeSocial(db: JuriDb, plan: ReceivePlan): Promise<void> {
  if (plan.contact) await db.contacts.put(plan.contact);
  if (plan.kudos.length > 0) await db.kudos.bulkAdd([...plan.kudos]);
}
