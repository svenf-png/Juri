/**
 * High fives geben (M11, ADR-015): ein High five je Kontakt und Lerntag, damit es nichts zu jagen
 * gibt. Was mitreist (Mitreise, A9) und wie ein High five zur Datei wird. Rein: Uhr und Zufall
 * kommen von außen.
 */
import { dayKey, learningDay } from '../calendar/day';
import { MAX_HIGH_FIVES_PER_FILE, type HighFive } from '../juri/format';
import type { Contact, Kudo } from '../model/records';
import { withCelebrated } from './contacts';
import type { Win } from './wins';

/** So lange reist ein gegebenes High five in Dateien mit (Tage). */
export const CARRY_DAYS = 30;

const DAY_MS = 86_400_000;

export const lernDayOf = (now: number): string => dayKey(learningDay(new Date(now)));

/** Wurde diesem Kontakt an diesem Lerntag schon ein High five gegeben? */
export function givenOn(
  kudos: readonly Pick<Kudo, 'direction' | 'contactId' | 'day'>[],
  contactId: string,
  day: string,
): boolean {
  return kudos.some((k) => k.direction === 'given' && k.contactId === contactId && k.day === day);
}

export interface GivePlan {
  readonly kudo: Kudo;
  readonly contact: Contact;
}

/** Ein High five an `contact`; `null`, wenn heute schon eines gegeben wurde. */
export function planGive(input: {
  readonly contact: Contact;
  /** Anlass; `undefined` heißt „einfach so“. */
  readonly win: Win | undefined;
  readonly kudos: readonly Pick<Kudo, 'direction' | 'contactId' | 'day'>[];
  readonly now: number;
  readonly newId: () => string;
}): GivePlan | null {
  const day = lernDayOf(input.now);
  if (givenOn(input.kudos, input.contact.id, day)) return null;
  const { win } = input;
  return {
    kudo: {
      id: input.newId(),
      direction: 'given',
      contactId: input.contact.id,
      at: input.now,
      day,
      ...(win ? { win: win.text } : {}),
      seen: true,
    },
    contact: win
      ? { ...input.contact, celebrated: withCelebrated(input.contact.celebrated, win.key) }
      : input.contact,
  };
}

/** Gegebene High fives, die in eine Datei mitreisen: die letzten 30 Tage, neueste zuerst, höchstens 50. */
export function outgoingHighFives(kudos: readonly Kudo[], now: number): HighFive[] {
  return kudos
    .filter((k) => k.direction === 'given' && k.at <= now && now - k.at <= CARRY_DAYS * DAY_MS)
    .sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1))
    .slice(0, MAX_HIGH_FIVES_PER_FILE)
    .map((k) => ({
      id: k.id,
      at: k.at,
      to: k.contactId,
      ...(k.win !== undefined ? { win: k.win } : {}),
    }));
}
