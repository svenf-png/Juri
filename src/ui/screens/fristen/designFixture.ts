/**
 * Beispieldaten der Designs (Fristen.dc.html und die Artboards FristenLeer, FristenEndspurt,
 * FristNeu, FristBearbeiten, FristFehler, FristUmfang, FristLoeschen) für den Bildvergleich
 * (/styleguide/fristen/…, A12). Die Karten sind fertige Modelle, ohne Datenbank.
 */
import type { DeadlineCard, DeadlinesModel } from '@/domain/deadlines/list';
import type { DeadlineDraft } from '@/domain/deadlines/form';
import type { DeadlineStatus } from '@/domain/deadlines/status';
import type { Area, Deck } from '@/domain/model/records';

const status = (over: Partial<DeadlineStatus>): DeadlineStatus => ({
  phase: 'upcoming',
  daysLeft: 11,
  sprintFrom: null,
  cards: 0,
  decks: 0,
  items: 0,
  secure: null,
  ...over,
});

const hero = (over: Partial<DeadlineCard>): DeadlineCard => ({
  id: 'klausur',
  tone: 'hero',
  eyebrow: 'Klausur',
  name: 'Zivilrecht, AG-Klausur',
  detail: 'Fr, 9.10. · ZR · 3 Stapel · 101 Karten',
  count: { big: '11', unit: 'Tage' },
  progress: { percent: 64, label: '64 % sitzen sicher' },
  sprint: 'Endspurt ab Fr, 2.10.',
  status: status({ secure: 64 }),
  ...over,
});

const llm: DeadlineCard = {
  id: 'llm',
  tone: 'plain',
  eyebrow: 'LL.M.',
  name: 'Modul Vertragsrecht',
  detail: 'Fr, 15.1.2027 · Tag #LLM · 58 Karten',
  count: { big: '109', unit: 'Tage' },
  progress: null,
  sprint: null,
  status: status({ daysLeft: 109 }),
};

const examen: DeadlineCard = {
  id: 'examen',
  tone: 'undated',
  eyebrow: 'Examen',
  name: '2. Staatsexamen, schriftlich',
  detail: 'Alle Rechtsgebiete',
  count: null,
  progress: null,
  sprint: null,
  status: status({ phase: 'undated', daysLeft: null }),
};

export const LISTE: DeadlinesModel = { cards: [hero({}), llm, examen], empty: false };

export const LEER: DeadlinesModel = { cards: [], empty: true };

export const ENDSPURT: DeadlinesModel = {
  empty: false,
  cards: [
    hero({
      detail: 'Mo, 12.10. · ZR · 3 Stapel · 101 Karten',
      count: { big: '4', unit: 'Tage' },
      progress: { percent: 82, label: '82 % sitzen sicher' },
      sprint: 'Endspurt läuft',
      status: status({ phase: 'sprint', daysLeft: 4, secure: 82 }),
    }),
    { ...llm, count: { big: '102', unit: 'Tage' }, status: status({ daysLeft: 102 }) },
    {
      id: 'alt',
      tone: 'expired',
      eyebrow: 'Klausur',
      name: 'Strafrecht, AG-Klausur',
      detail: 'Di, 22.9. · SR',
      count: null,
      progress: null,
      sprint: null,
      status: status({ phase: 'expired', daysLeft: -13 }),
    },
  ],
};

export const AREAS: Area[] = [
  { id: 'zr', code: 'ZR', name: 'Zivilrecht', createdAt: 1, updatedAt: 1 },
  { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht', createdAt: 2, updatedAt: 2 },
  { id: 'sr', code: 'SR', name: 'Strafrecht', createdAt: 3, updatedAt: 3 },
];

const deck = (id: string, name: string, areaIds: string[]): Deck => ({
  id,
  name,
  norm: '',
  areaIds,
  createdAt: 1,
  updatedAt: 1,
});

export const DECKS: Deck[] = [
  deck('amt', 'Amtshaftung', ['zr', 'oer']),
  deck('delikt', 'Deliktsrecht', ['zr']),
  deck('sach', 'Sachenrecht', ['zr']),
  deck('schuld', 'Schuldrecht AT', ['zr']),
  deck('stpo', 'Strafprozess', ['sr']),
];

export const TAGS = ['Definition', 'Klausur', 'LLM'];

export const NEU: DeadlineDraft = {
  kind: 'klausur',
  name: '',
  date: '',
  scope: { all: true, areaIds: [], deckIds: [], tags: [] },
  sprint: true,
};

export const BEARBEITEN: DeadlineDraft = {
  kind: 'klausur',
  name: 'Zivilrecht, AG-Klausur',
  date: '2026-10-09',
  scope: { all: false, areaIds: ['zr'], deckIds: ['amt'], tags: ['LLM'] },
  sprint: true,
};

export const FEHLER: DeadlineDraft = { ...NEU, date: '2026-09-20' };
