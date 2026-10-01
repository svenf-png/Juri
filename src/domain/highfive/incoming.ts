/**
 * Eingehende High fives und Kontakte (M11, ADR-015): aus dem Manifest einer `.juri`- oder
 * Gruß-Datei wird ein Plan, den die Datenschicht in EINER Transaktion mit dem Karten-Import
 * schreibt. Rein: Uhr kommt als Parameter. Nichts hier ist authentifiziert (A69): Die Absender-ID
 * ist reine Anzeige und lässt sich fälschen; es steht nichts darauf, was Zugriff gäbe.
 *
 * Regeln: Ohne Absender-ID entsteht kein Kontakt und kein High five zählt. Eigene High fives (gleiche
 * ID wie die eigene) kommen nicht an. Ein High five mit fremdem Empfänger (`to`) wird ignoriert.
 * Dieselbe ID zählt nur einmal (wiederholter Import ändert nichts), je Absender und Lerntag zählt
 * höchstens eines („kein Zähler zum Jagen“), je Datei höchstens 50.
 */
import { dayKey, learningDay } from '../calendar/day';
import {
  MAX_HIGH_FIVES_PER_FILE,
  type GreetingManifest,
  type HighFive,
  type Manifest,
} from '../juri/format';
import { MAX_CONTACTS, type Achievements, type Contact, type Kudo } from '../model/records';
import { seedCelebrated } from './wins';

export interface ReceiveInput {
  /** Eigene Absender-ID; `undefined`, solange diese Installation noch nie geteilt hat. */
  readonly ownId: string | undefined;
  readonly sender: { readonly id?: string | undefined; readonly name: string } | undefined;
  /** Zeitpunkt, an dem der Absender die Datei erzeugt hat (`manifest.createdAt`). */
  readonly createdAt: number;
  readonly achievements?: Achievements | undefined;
  readonly highFives: readonly HighFive[];
  /** Der bekannte Kontakt zu `sender.id`, falls vorhanden. */
  readonly contact: Contact | undefined;
  /** IDs aus der Datei, die schon als High five gespeichert sind (gleich welcher Richtung). */
  readonly knownIds: ReadonlySet<string>;
  /** Wie viele Kontakte es schon gibt (Obergrenze `MAX_CONTACTS`). */
  readonly contactCount?: number;
  /** Lerntage („JJJJ-MM-TT“), an denen von diesem Absender schon ein High five ankam. */
  readonly receivedDays: ReadonlySet<string>;
  readonly now: number;
}

/** Warum High fives nicht gezählt wurden, als Zahlen. */
export interface Skipped {
  readonly noSender: number;
  readonly fromSelf: number;
  readonly foreign: number;
  readonly duplicate: number;
  readonly perDay: number;
  readonly tooMany: number;
}

export interface ReceivePlan {
  /** Neuer oder aktualisierter Kontakt; `null`, wenn es nichts zu schreiben gibt. */
  readonly contact: Contact | null;
  readonly contactIsNew: boolean;
  readonly kudos: readonly Kudo[];
  readonly skipped: Skipped;
  /** Es gibt nichts zu schreiben. */
  readonly empty: boolean;
}

/** Der Teil einer Datei, der Kontakte und High fives betrifft. */
export function socialFromManifest(manifest: Manifest | GreetingManifest) {
  return {
    sender: manifest.sender,
    createdAt: manifest.createdAt,
    achievements: manifest.achievements,
    highFives: manifest.highFives ?? [],
  };
}

export const NOTHING_SKIPPED: Skipped = {
  noSender: 0,
  fromSelf: 0,
  foreign: 0,
  duplicate: 0,
  perDay: 0,
  tooMany: 0,
};

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function planReceive(input: ReceiveInput): ReceivePlan {
  const { sender, now } = input;
  const total = input.highFives.length;
  const empty = (skipped: Partial<Skipped>): ReceivePlan => ({
    contact: null,
    contactIsNew: false,
    kudos: [],
    skipped: { ...NOTHING_SKIPPED, ...skipped },
    empty: true,
  });
  if (!sender?.id) return empty({ noSender: total });
  if (sender.id === input.ownId) return empty({ fromSelf: total });

  // Ein neuer Kontakt braucht Platz; ohne ihn bleibt alles wie es ist.
  if (!input.contact && (input.contactCount ?? 0) >= MAX_CONTACTS)
    return empty({ noSender: total });

  const kudos: Kudo[] = [];
  let foreign = 0;
  let duplicate = 0;
  let perDay = 0;
  const seenIds = new Set<string>();
  const days = new Set(input.receivedDays);
  const accepted = input.highFives.slice(0, MAX_HIGH_FIVES_PER_FILE);
  const tooMany = total - accepted.length;
  // Älteste zuerst: Bei zwei High fives am selben Lerntag zählt das frühere.
  const ordered = [...accepted].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  for (const hf of ordered) {
    if (hf.to !== undefined && hf.to !== input.ownId) {
      foreign += 1;
      continue;
    }
    if (input.knownIds.has(hf.id) || seenIds.has(hf.id)) {
      duplicate += 1;
      continue;
    }
    seenIds.add(hf.id);
    const at = Math.min(hf.at, now);
    const day = dayKey(learningDay(new Date(at)));
    if (days.has(day)) {
      perDay += 1;
      continue;
    }
    days.add(day);
    kudos.push({
      id: hf.id,
      direction: 'received',
      contactId: sender.id,
      at,
      day,
      ...(hf.win !== undefined ? { win: hf.win } : {}),
      seen: false,
    });
  }

  const known = input.contact;
  let contact: Contact;
  if (known) {
    const fresh = input.achievements;
    const newer =
      fresh !== undefined && (known.snapshot === undefined || input.createdAt > known.snapshot.at);
    contact = {
      ...known,
      sentName: sender.name,
      lastSeenAt: Math.max(known.lastSeenAt, input.createdAt),
      ...(newer ? { snapshot: { at: input.createdAt, achievements: fresh } } : {}),
    };
  } else {
    contact = {
      id: sender.id,
      sentName: sender.name,
      firstSeenAt: now,
      lastSeenAt: input.createdAt,
      ...(input.achievements
        ? { snapshot: { at: input.createdAt, achievements: input.achievements } }
        : {}),
      celebrated: seedCelebrated(input.achievements),
    };
  }
  const changed = known === undefined || !sameJson(known, contact);
  return {
    contact: changed ? contact : null,
    contactIsNew: known === undefined,
    kudos,
    skipped: { ...NOTHING_SKIPPED, foreign, duplicate, perDay, tooMany },
    empty: !changed && kudos.length === 0,
  };
}
