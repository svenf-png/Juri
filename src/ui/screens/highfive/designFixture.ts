/*
 * Beispieldaten der High-five-Artboards (design/HighFive.dc.html und die Boards aus
 * scripts/build-highfive-designs.mjs). Der Bildvergleich (tests/e2e/highfive.spec.ts) stellt App
 * und Design mit denselben Zahlen und Texten gegenüber; die Zeichenketten stehen deshalb wörtlich hier.
 */
import type { ContactView, HighFivesModel, PersonView, ReceivedView } from '@/domain/highfive/view';

const person = (
  id: string,
  name: string,
  win: string,
  sentence: string,
  given: boolean,
): PersonView => ({
  id,
  name,
  initial: name.slice(0, 1),
  win,
  sentence,
  open: given ? null : { key: `k:${id}`, text: win, sentence },
  given,
  aria: `High five an ${name}`,
});

const MARA = person('mara', 'Mara', '12 Tage in Folge', 'hat 12 Tage in Folge geschafft', false);
const JONAS = person('jonas', 'Jonas', '200 Karten angelegt', 'hat 200 Karten angelegt', false);

const RECEIVED: ReceivedView[] = [
  {
    id: 'r1',
    contactId: 'mara',
    name: 'Mara',
    initial: 'M',
    reason: 'für 1.000 Wiederholungen',
    when: 'gestern',
    seen: true,
  },
  {
    id: 'r2',
    contactId: 'jonas',
    name: 'Jonas',
    initial: 'J',
    reason: 'einfach so',
    when: 'Sa',
    seen: true,
  },
];

export const CONTACTS: ContactView[] = [
  {
    id: 'mara',
    name: 'Mara',
    initial: 'M',
    renamed: false,
    sentName: 'Mara',
    sub: '12 Tage in Folge · zuletzt gesehen gestern',
  },
  {
    id: 'jonas',
    name: 'Jonas',
    initial: 'J',
    renamed: false,
    sentName: 'Jonas',
    sub: 'zuletzt gesehen Sa',
  },
];

export const MARA_CONTACT = CONTACTS[0] as ContactView;

export const listModel: HighFivesModel = {
  empty: false,
  people: [MARA, JONAS],
  received: RECEIVED,
  unseen: [],
  contacts: CONTACTS,
};

export const leerModel: HighFivesModel = {
  empty: true,
  people: [],
  received: [],
  unseen: [],
  contacts: [],
};

/** Nach dem Geben: Mara mit lila Knopf. */
export const givenModel: HighFivesModel = {
  ...listModel,
  people: [{ ...MARA, given: true, open: null }, JONAS],
};

export const FEIER_TEXT = 'Mara schickt dir ein High five für 12 Tage in Folge.';
export const GREETING_TEXT = 'Mara schickt dir ein High five für 12 Tage in Folge.';
export const GREETING_HINT = 'Mara kommt zu deinen Kontakten.';
export const GREETING_ERROR = 'Dieses High five ist für jemand anderen.';
export const GIVEN_TEXT = 'An Mara für „12 Tage in Folge“';
export const ANY_TEXT = 'Einfach so. Such dir aus, an wen.';

/** Platzhalter für die Bildkarte (die App zeigt das gezeichnete PNG; der Vergleich prüft nur die Lage). */
export const PREVIEW_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='216' height='270'%3E%3Crect width='216' height='270' fill='%236A3FE0'/%3E%3C/svg%3E";
