/**
 * Ansichtsmodell für High fives (HighFive.dc.html): „Neu von deinen Leuten“, „Bekommen“, die
 * Feier und die Kontaktliste, dazu die Zeilen in Heute (A17) und Erfolge (A66). Rein: Die Uhr
 * kommt als Parameter, Lerntage zählen ab 04:00 (Entscheidung 6).
 */
import { dayKey, daysBetween, learningDay, parseDayKey, weekday } from '../calendar/day';
import type { Contact, Kudo } from '../model/records';
import type { HighFiveInput } from '../today/today';
import { contactInitial, contactName, nameList, sortContacts } from './contacts';
import { givenOn } from './give';
import { nextWin, type Win } from './wins';

/** Wie viele Leute unter „Neu von deinen Leuten“ stehen. */
export const MAX_PEOPLE = 5;
/** Wie viele bekommene High fives „Bekommen“ zeigt. */
export const MAX_RECEIVED = 20;

export interface PersonView {
  readonly id: string;
  readonly name: string;
  readonly initial: string;
  /** Anlass: „12 Tage in Folge“. */
  readonly win: string;
  /** Satz nach dem Namen: „hat 12 Tage in Folge geschafft“. */
  readonly sentence: string;
  /** Der Anlass, falls noch zu feiern (fehlt, wenn heute schon ein High five ging). */
  readonly open: Win | null;
  /** Heute schon ein High five gegeben. */
  readonly given: boolean;
  /** ID des heute gegebenen High fives (für die Gruß-Datei). */
  readonly kudoId?: string;
  readonly aria: string;
}

export interface ReceivedView {
  readonly id: string;
  readonly contactId: string;
  readonly name: string;
  readonly initial: string;
  /** „für 1.000 Wiederholungen“ oder „einfach so“. */
  readonly reason: string;
  /** „heute“, „gestern“, „Sa“ oder „12.09.“. */
  readonly when: string;
  readonly seen: boolean;
}

export interface ContactView {
  readonly id: string;
  readonly name: string;
  readonly initial: string;
  /** Eigener Name vergeben? */
  readonly renamed: boolean;
  readonly sentName: string;
  /** „12 Tage in Folge · zuletzt gesehen gestern“ */
  readonly sub: string;
}

export interface HighFivesModel {
  /** Noch keine Kontakte. */
  readonly empty: boolean;
  readonly people: readonly PersonView[];
  readonly received: readonly ReceivedView[];
  /** Noch nicht gefeierte bekommene High fives (neueste zuerst). */
  readonly unseen: readonly ReceivedView[];
  readonly contacts: readonly ContactView[];
}

/** „heute“, „gestern“, Wochentag bis zu sechs Tage zurück, sonst „12.09.“. */
export function whenLabel(day: string, today: string): string {
  const diff = daysBetween(parseDayKey(day), parseDayKey(today));
  if (diff <= 0) return 'heute';
  if (diff === 1) return 'gestern';
  const d = parseDayKey(day);
  if (diff <= 6) return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][weekday(d)] ?? '';
  return `${String(d.day).padStart(2, '0')}.${String(d.month).padStart(2, '0')}.`;
}

const reasonOf = (win: string | undefined) => (win ? `für ${win}` : 'einfach so');

export function highFivesModel(
  contacts: readonly Contact[],
  kudos: readonly Kudo[],
  now: number,
): HighFivesModel {
  const today = dayKey(learningDay(new Date(now)));
  const sorted = sortContacts(contacts);
  const byId = new Map(sorted.map((c) => [c.id, c]));

  const people: PersonView[] = [];
  for (const contact of sorted) {
    const name = contactName(contact);
    const given = givenOn(kudos, contact.id, today);
    const open = given ? null : nextWin(contact.snapshot?.achievements, contact.celebrated);
    // Wer heute ein High five bekommen hat, bleibt mit lila Knopf stehen (HighFive.dc.html).
    const givenWin = given
      ? kudos.find((k) => k.direction === 'given' && k.contactId === contact.id && k.day === today)
      : undefined;
    if (!open && !given) continue;
    const win = open?.text ?? givenWin?.win ?? '';
    people.push({
      id: contact.id,
      name,
      initial: contactInitial(contact),
      win,
      sentence: open?.sentence ?? (win ? `hat ${win}` : ''),
      open,
      given,
      ...(givenWin ? { kudoId: givenWin.id } : {}),
      aria: `High five an ${name}`,
    });
  }

  const received: ReceivedView[] = kudos
    .filter((k) => k.direction === 'received' && byId.has(k.contactId))
    .sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1))
    .map((k) => {
      const contact = byId.get(k.contactId) as Contact;
      return {
        id: k.id,
        contactId: contact.id,
        name: contactName(contact),
        initial: contactInitial(contact),
        reason: reasonOf(k.win),
        when: whenLabel(k.day, today),
        seen: k.seen,
      };
    });

  const contactViews: ContactView[] = sorted.map((c) => {
    const streak = c.snapshot?.achievements.streak ?? 0;
    const seen = `zuletzt gesehen ${whenLabel(dayKey(learningDay(new Date(c.lastSeenAt))), today)}`;
    return {
      id: c.id,
      name: contactName(c),
      initial: contactInitial(c),
      renamed: c.alias !== undefined,
      sentName: c.sentName,
      sub: streak >= 3 ? `${String(streak)} Tage in Folge · ${seen}` : seen,
    };
  });

  return {
    empty: contacts.length === 0,
    people: people.slice(0, MAX_PEOPLE),
    received: received.slice(0, MAX_RECEIVED),
    unseen: received.filter((r) => !r.seen),
    contacts: contactViews,
  };
}

/** Text der Feier beim Empfangen: ein Absender mit Anlass, sonst die Zahl. */
export function feierText(unseen: readonly ReceivedView[]): { title: string; text: string } {
  const first = unseen[0];
  if (unseen.length === 1 && first) {
    return {
      title: 'High five!',
      text: `${first.name} schickt dir ein High five ${first.reason}.`,
    };
  }
  const names = [...new Set(unseen.map((r) => r.name))];
  return {
    title: 'High five!',
    text: `${String(unseen.length)} neue High fives von ${nameList(names)}.`,
  };
}

/** Der Chip in Heute (A17): die erste Person, der noch ein High five zusteht. */
export function heuteHighFive(model: HighFivesModel): HighFiveInput | null {
  const person = model.people.find((p) => p.open !== null);
  return person ? { id: person.id, name: person.name, text: person.sentence } : null;
}

/** Zeile und Kachel in Erfolge (A66): bekommene und noch offene High fives. */
export function erfolgeHighFives(model: HighFivesModel): {
  received: number;
  open: number;
  names: string;
} {
  const open = model.people.filter((p) => p.open !== null);
  const unseen = model.unseen;
  const names = open.length > 0 ? open.map((p) => p.name) : [...new Set(unseen.map((r) => r.name))];
  return { received: unseen.length, open: open.length, names: nameList(names) };
}
