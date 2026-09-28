import { parseDayKey } from '@/domain/calendar/day';
import { todayModel, type TodayInput } from '@/domain/today/today';

/**
 * Feste Beispieldaten aus Main.dc.html und iPadHeute.dc.html für die Design-Vorschau
 * (/styleguide/heute), den Screenshot-Test und die Bilder in docs/bilder/. Keine Nutzerdaten:
 * Nichts davon wird gespeichert (A11).
 */
export const DESIGN_NAME = 'Sven';

export const designInput: TodayInput = {
  today: parseDayKey('2026-09-28'),
  totalCards: 240,
  due: 18,
  dueByArea: [
    { id: 'zr', code: 'ZR', name: 'Zivilrecht', due: 8 },
    { id: 'sr', code: 'SR', name: 'Strafrecht', due: 6 },
    { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht', due: 6 },
  ],
  goal: { done: 6, target: 24 },
  levels: {
    '2026-09-22': 3,
    '2026-09-23': 4,
    '2026-09-25': 2,
    '2026-09-26': 3,
    '2026-09-27': 1,
    '2026-09-28': 2,
  },
  recordDay: '2026-09-23',
  createdThisWeek: 3,
  deadlines: [
    { id: 'zr', title: 'Klausur Zivilrecht', date: '2026-10-09', secureShare: 64 },
    { id: 'llm', title: 'LL.M. Modul Vertragsrecht', date: '2027-01-15' },
  ],
  highFive: { id: 'mara', name: 'Mara', text: 'hat 12 Tage in Folge geschafft' },
};

export const designModel = todayModel(designInput);

/**
 * HeuteErledigt.dc.html: nichts mehr fällig, das Tagesziel ist voll (24 von 24), der heutige Tag
 * leuchtet in der höchsten Stufe; keine Fristen, kein High five.
 */
export const erledigtModel = todayModel({
  ...designInput,
  due: 0,
  dueByArea: [],
  goal: { done: 24, target: 24 },
  levels: { ...designInput.levels, '2026-09-28': 4 },
  createdThisWeek: 3,
  deadlines: [],
  highFive: null,
});
