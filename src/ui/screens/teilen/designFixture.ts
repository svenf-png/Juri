/*
 * Beispieldaten der Teilen-Artboards (design/Teilen*.dc.html, erzeugt von
 * scripts/build-teilen-designs.mjs). Der Bildvergleich (tests/e2e/teilen.spec.ts) stellt App und
 * Design mit denselben Zahlen und Texten gegenüber; die Zeichenketten stehen deshalb wörtlich hier.
 */
import type { Conflict, MergeSummary } from '@/domain/juri/merge';
import type { Area, Deck } from '@/domain/model/records';
import type { ExportModel, IncomingModel } from './TeilenView';

export const READY: ExportModel = {
  kind: 'ready',
  fileName: 'Amtshaftung.juri',
  summary: '21 Karten · 3 PDFs · 2,4 MB',
  deckLabel: 'Amtshaftung · ZR',
  notes: false,
  achievements: true,
  action: 'AirDrop, Nachrichten, Mail …',
  canSend: true,
};

export const EMPTY_EXPORT: ExportModel = { kind: 'empty' };

export const IDLE: IncomingModel = {
  kind: 'idle',
  hint: 'Stapel von anderen kommen als .juri-Datei. Sichere sie zuerst in „Dateien“, dann öffnest du sie hier.',
};

export const PREVIEW: IncomingModel = {
  kind: 'preview',
  view: {
    title: 'StPO: Revision',
    meta: 'von Mara · 27 Karten',
    letter: 'M',
    decks: [{ name: 'StPO: Revision', cards: '27 Karten' }],
  },
  mode: 'update',
  updateHint:
    'Du hast den Stapel schon. 3 neue Karten, 2 Karten geändert. Dein Fortschritt bleibt.',
  copyHint: 'Eigener, unabhängiger Stapel',
  nothing: null,
  busy: false,
};

export const ERROR: IncomingModel = { kind: 'error', message: 'Diese Datei ist kein Juri-Stapel.' };

const at = 1;
const area = (id: string, code: string, name: string): Area => ({
  id,
  code,
  name,
  createdAt: at,
  updatedAt: at,
});
const deck = (id: string, name: string, areaIds: string[]): Deck => ({
  id,
  name,
  norm: '',
  areaIds,
  createdAt: at,
  updatedAt: at,
});

export const AREAS: Area[] = [
  area('zr', 'ZR', 'Zivilrecht'),
  area('sr', 'SR', 'Strafrecht'),
  area('oer', 'ÖR', 'Öffentliches Recht'),
];
export const DECKS: Deck[] = [
  deck('delikt', 'Deliktsrecht', ['zr']),
  deck('zpo', 'ZPO: Versäumnisurteil', ['zr']),
  deck('amt', 'Amtshaftung', ['zr']),
  deck('diebstahl', 'Diebstahl & Betrug', ['sr']),
  deck('stpo', 'StPO: Revision', ['sr']),
];
export const CARD_COUNTS: Record<string, number> = {
  delikt: 48,
  zpo: 32,
  amt: 21,
  diebstahl: 40,
  stpo: 27,
};

export const CONFLICTS: Conflict[] = [
  {
    cardId: 'k1',
    deckId: 'stpo',
    deckName: 'StPO: Revision',
    title: 'Was ist Besitzdiener?',
    kind: 'changed',
    resolution: 'mine',
  },
  {
    cardId: 'k2',
    deckId: 'stpo',
    deckName: 'StPO: Revision',
    title: 'Revisionsgründe',
    kind: 'deleted',
    resolution: 'theirs',
  },
];

export const SUMMARY: MergeSummary = {
  decksNew: 0,
  decksKnown: 1,
  cardsNew: 3,
  cardsUpdated: 2,
  cardsUnchanged: 22,
  cardsKeptMine: 1,
  cardsStayDeleted: 0,
  cardsMissingInFile: 0,
  mediaNew: 0,
  linksDropped: 0,
};
