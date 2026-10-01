/** Kontakte (M11, ADR-015): Anzeigename, Reihenfolge, Umbenennen. Rein. */
import { omit } from '../juri/omit';
import { initialOf, normalizeName } from '../profile/name';
import { MAX_CELEBRATED, type Contact } from '../model/records';

export const contactName = (contact: Pick<Contact, 'sentName' | 'alias'>): string =>
  contact.alias ?? contact.sentName;

export const contactInitial = (contact: Pick<Contact, 'sentName' | 'alias'>): string =>
  initialOf(contactName(contact));

/** Zuletzt gesehene zuerst, bei Gleichstand nach Name, dann nach ID (stabil). */
export function sortContacts(contacts: readonly Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) =>
      b.lastSeenAt - a.lastSeenAt ||
      contactName(a).localeCompare(contactName(b), 'de') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Eigener Name für den Kontakt; ein leerer Name nimmt den eigenen Namen weg (es gilt der gesendete). */
export function renameContact(contact: Contact, input: string): Contact {
  const alias = normalizeName(input);
  const rest = omit(contact, 'alias');
  return alias === '' || alias === contact.sentName ? rest : { ...rest, alias };
}

/** Schlüssel hinzufügen; die ältesten fallen heraus, wenn die Grenze erreicht ist. */
export function withCelebrated(celebrated: readonly string[], key: string): string[] {
  if (celebrated.includes(key)) return [...celebrated];
  return [...celebrated, key].slice(-MAX_CELEBRATED);
}

/** „Mara“ · „Mara und Jonas“ · „Mara, Jonas und Lea“ (höchstens drei, dann „und N weitere“). */
export function nameList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0] ?? ''} und ${names[1] ?? ''}`;
  if (names.length === 3) return `${names[0] ?? ''}, ${names[1] ?? ''} und ${names[2] ?? ''}`;
  const rest = names.length - 2;
  return `${names[0] ?? ''}, ${names[1] ?? ''} und ${String(rest)} weitere`;
}
