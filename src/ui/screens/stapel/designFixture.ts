import type { DeckModel, LibraryModel } from '@/domain/library/library';

/**
 * Feste Beispieldaten aus Bibliothek.dc.html, Stapel.dc.html und iPadStapel.dc.html für die
 * Design-Vorschau (/styleguide/stapel/…) und den Bildvergleich. Keine Nutzerdaten (A11).
 * Reihenfolge und Beschriftungen wie im Design, auch wo die App sie anders bildet
 * (z. B. „von Mara“ kommt erst mit dem Import in M9).
 */

const filters = [
  { id: 'ALL', label: 'Alle' },
  { id: 'zr', label: 'ZR' },
  { id: 'sr', label: 'SR' },
  { id: 'oer', label: 'ÖR' },
] as const;

/** Bibliothek.dc.html (iPhone). */
export const phoneLibrary: LibraryModel = {
  filters,
  filter: 'ALL',
  empty: false,
  filterEmpty: false,
  groups: [
    {
      id: 'zr',
      code: 'ZR',
      name: 'Zivilrecht',
      stacks: [
        { id: 'delikt', name: 'Deliktsrecht', meta: '48 Karten', also: null, due: 3 },
        { id: 'zpo', name: 'ZPO: Versäumnisurteil', meta: '32 Karten', also: null, due: 3 },
        { id: 'amt', name: 'Amtshaftung', meta: '21 Karten · von Mara', also: 'auch ÖR', due: 2 },
      ],
    },
    {
      id: 'sr',
      code: 'SR',
      name: 'Strafrecht',
      stacks: [
        { id: 'betrug', name: 'Diebstahl & Betrug', meta: '40 Karten', also: null, due: 4 },
        { id: 'stpo', name: 'StPO: Revision', meta: '27 Karten · von Mara', also: null, due: 2 },
      ],
    },
    {
      id: 'oer',
      code: 'ÖR',
      name: 'Öffentliches Recht',
      stacks: [
        { id: 'amt', name: 'Amtshaftung', meta: '21 Karten · von Mara', also: 'auch ZR', due: 2 },
        { id: 'vwgo', name: 'VwGO: Anfechtungsklage', meta: '35 Karten', also: null, due: 4 },
        { id: 'staat', name: 'Staatsorganisationsrecht', meta: '18 Karten', also: null, due: 0 },
      ],
    },
  ],
};

/** Die Liste in iPadStapel.dc.html. */
export const padLibrary: LibraryModel = {
  ...phoneLibrary,
  groups: [
    {
      id: 'zr',
      code: 'ZR',
      name: 'Zivilrecht',
      stacks: [
        { id: 'delikt', name: 'Deliktsrecht', meta: '48 Karten', also: null, due: 3 },
        { id: 'zpo', name: 'ZPO: Versäumnisurteil', meta: '32 Karten', also: null, due: 3 },
        { id: 'amt', name: 'Amtshaftung', meta: '21 Karten', also: 'auch ÖR', due: 2 },
      ],
    },
    {
      id: 'sr',
      code: 'SR',
      name: 'Strafrecht',
      stacks: [
        { id: 'betrug', name: 'Diebstahl & Betrug', meta: '40 Karten', also: null, due: 4 },
        { id: 'stpo', name: 'StPO: Revision', meta: '27 Karten', also: null, due: 2 },
      ],
    },
    {
      id: 'oer',
      code: 'ÖR',
      name: 'Öffentliches Recht',
      stacks: [
        { id: 'amt', name: 'Amtshaftung', meta: '21 Karten', also: 'auch ZR', due: 2 },
        { id: 'vwgo', name: 'VwGO: Anfechtungsklage', meta: '35 Karten', also: null, due: 4 },
      ],
    },
  ],
};

const norm = '§ 839 BGB i. V. m. Art. 34 GG · von Mara · Version 3';
const areas = [
  { id: 'zr', name: 'Zivilrecht', on: true, locked: false },
  { id: 'oer', name: 'Öffentliches Recht', on: true, locked: false },
  { id: 'sr', name: 'Strafrecht', on: false, locked: false },
];
const bar = [
  { key: 'secure', label: '10 sicher', pct: 48 },
  { key: 'learning', label: '7 im Lernen', pct: 33 },
  { key: 'fresh', label: '4 neu', pct: 19 },
] as const;

/** Stapel.dc.html (iPhone): Amtshaftung. */
export const phoneDeck: DeckModel = {
  id: 'amt',
  name: 'Amtshaftung',
  norm,
  areas,
  bar,
  cta: { kind: 'learn', label: '2 fällige Karten lernen', short: '2 fällige lernen' },
  cardCount: '21 Karten',
  cards: [
    {
      id: 'c1',
      type: 'Frage',
      title: 'Wer haftet nach Art. 34 S. 1 GG im Außenverhältnis?',
      norm: 'Art. 34 S. 1 GG',
    },
    { id: 'c2', type: 'Schema', title: 'Amtshaftungsanspruch: Prüfungsaufbau', norm: '§ 839 BGB' },
    { id: 'c3', type: 'Lücke', title: 'Subsidiarität nach § 839 I 2 BGB', norm: '§ 839 I 2 BGB' },
    { id: 'c4', type: 'Abdeckung', title: 'Übersicht Staatshaftung (PDF, S. 3)', norm: 'PDF S. 3' },
  ],
};

/** iPadStapel.dc.html: Amtshaftung mit sechs Karten. */
export const padDeck: DeckModel = {
  ...phoneDeck,
  cards: [
    {
      id: 'c1',
      type: 'Frage',
      title: 'Wer haftet nach Art. 34 S. 1 GG im Außenverhältnis?',
      norm: 'Art. 34 S. 1 GG',
    },
    { id: 'c2', type: 'Schema', title: 'Amtshaftungsanspruch: Prüfungsaufbau', norm: '§ 839 BGB' },
    { id: 'c3', type: 'Lücke', title: 'Subsidiarität bei Fahrlässigkeit', norm: '§ 839 I 2 BGB' },
    { id: 'c4', type: 'Abdeckung', title: 'Übersicht Staatshaftung', norm: 'PDF S. 3' },
    {
      id: 'c5',
      type: 'Frage',
      title: 'Wann ist eine Amtspflicht drittbezogen?',
      norm: '§ 839 BGB',
    },
    {
      id: 'c6',
      type: 'Frage',
      title: 'Folge der schuldhaften Nichteinlegung eines Rechtsmittels?',
      norm: '§ 839 III BGB',
    },
  ],
};
