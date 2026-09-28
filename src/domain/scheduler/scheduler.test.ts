import { describe, expect, it } from 'vitest';
import type { ReviewItem } from '../model/records';
import { FSRS_STATE, fsrsPreview, fsrsReview, goodStreak } from './fsrs';
import { formatDays, formatInterval } from './intervals';
import { boxDays, leitnerPreviewDays, leitnerReview, nextBox } from './leitner';
import { ratingKey, ratingValue } from './rating';
import {
  dueOf,
  isNewItem,
  maturityOf,
  previewIntervals,
  restoreItem,
  reviewItem,
  snapshotOf,
  withActiveDue,
} from './schedule';
import {
  clampNewPerDay,
  clampRetention,
  DEFAULT_LEARNING,
  setLeitnerDays,
  stepNewPerDay,
  withDefaults,
  type LearningSettings,
} from './settings';

const MIN = 60_000;
const DAY = 86_400_000;
const NOW = new Date(2026, 8, 28, 10, 0).getTime();
const fsrsSettings: LearningSettings = DEFAULT_LEARNING;
const leitnerSettings: LearningSettings = { ...DEFAULT_LEARNING, algorithm: 'leitner' };

const fresh = (id = 'k1'): ReviewItem => ({
  id,
  cardId: id,
  deckId: 'd1',
  sub: '',
  createdAt: 1,
});

describe('formatInterval', () => {
  it('nennt Minuten, Stunden, Tage, Monate und Jahre wie das Design', () => {
    expect(formatInterval(10 * MIN)).toBe('10 min');
    expect(formatInterval(20_000)).toBe('1 min');
    expect(formatInterval(5 * 60 * MIN)).toBe('5 Std');
    expect(formatInterval(1.2 * DAY)).toBe('1 T');
    expect(formatInterval(2 * DAY)).toBe('2 T');
    expect(formatInterval(44 * DAY)).toBe('44 T');
    expect(formatInterval(90 * DAY)).toBe('3 Mon');
    expect(formatInterval(547 * DAY)).toBe('1,5 J');
    expect(formatInterval(-5)).toBe('1 min');
    expect(formatDays(7)).toBe('7 T');
  });
});

describe('Bewertungen', () => {
  it('rechnet zwischen Stufe und Zahl', () => {
    expect(ratingValue('again')).toBe(1);
    expect(ratingValue('easy')).toBe(4);
    expect(ratingKey(3)).toBe('good');
    expect(() => ratingKey(0)).toThrow(RangeError);
  });
});

describe('FSRS-Adapter', () => {
  it('neue Abfrage: Nochmal 1 min, Schwer 6 min, Gut 10 min, Leicht in Tagen', () => {
    const p = fsrsPreview(undefined, NOW, fsrsSettings);
    expect(p[1].state.due - NOW).toBe(1 * MIN);
    expect(p[2].state.due - NOW).toBe(6 * MIN);
    expect(p[3].state.due - NOW).toBe(10 * MIN);
    expect(p[4].state.due - NOW).toBeGreaterThanOrEqual(DAY);
    expect(p[1].state.state).toBe(FSRS_STATE.learning);
    expect(p[4].state.state).toBe(FSRS_STATE.review);
  });

  it('die Vorschau ist genau das Ergebnis der Bewertung (keine Streuung)', () => {
    const p = fsrsPreview(undefined, NOW, fsrsSettings);
    for (const r of [1, 2, 3, 4] as const) {
      expect(fsrsReview(undefined, r, NOW, fsrsSettings).state).toEqual(p[r].state);
    }
  });

  it('Gut durch beide Lernschritte macht aus der Abfrage eine Wiederholung', () => {
    const a = fsrsReview(undefined, 3, NOW, fsrsSettings);
    const b = fsrsReview(a.state, 3, a.state.due, fsrsSettings);
    expect(b.state.state).toBe(FSRS_STATE.review);
    expect(b.state.due - a.state.due).toBeGreaterThanOrEqual(DAY);
    expect(b.state.lastReview).toBe(a.state.due);
  });

  it('Nochmal auf eine Wiederholung führt ins Wiederlernen und zählt einen Fehler', () => {
    const grad = fsrsReview(fsrsReview(undefined, 4, NOW, fsrsSettings).state, 1, NOW + 5 * DAY, fsrsSettings);
    expect(grad.state.state).toBe(FSRS_STATE.relearning);
    expect(grad.state.lapses).toBe(1);
    expect(grad.state.due - (NOW + 5 * DAY)).toBe(10 * MIN);
  });

  it('das Protokoll hält Zustand und Abstände vor der Bewertung fest', () => {
    const first = fsrsReview(undefined, 4, NOW, fsrsSettings);
    const second = fsrsReview(first.state, 3, NOW + 3 * DAY, fsrsSettings);
    expect(first.log.state).toBe(FSRS_STATE.new);
    expect(second.log.state).toBe(FSRS_STATE.review);
    expect(second.log.elapsedDays).toBe(3);
    expect(second.log.stability).toBe(first.state.stability);
  });

  it('höhere Behaltensquote heißt kürzere Abstände', () => {
    const base = fsrsReview(undefined, 4, NOW, fsrsSettings).state;
    const at = (retention: number) =>
      fsrsReview(base, 3, NOW + 4 * DAY, { retention }).state.scheduledDays;
    expect(at(95)).toBeLessThan(at(90));
    expect(at(90)).toBeLessThan(at(85));
  });

  it('kein Abstand übersteigt 180 Tage', () => {
    let state = fsrsReview(undefined, 4, NOW, fsrsSettings).state;
    for (let i = 0; i < 12; i += 1) {
      state = fsrsReview(state, 4, state.due, { retention: 80 }).state;
    }
    expect(state.scheduledDays).toBeLessThanOrEqual(180);
  });

  it('goodStreak liefert wachsende Abstände in Tagen', () => {
    const days = goodStreak(fsrsSettings);
    expect(days).toHaveLength(5);
    for (let i = 1; i < days.length; i += 1) expect(days[i]!).toBeGreaterThan(days[i - 1]!);
    expect(days.at(-1)!).toBeLessThanOrEqual(180);
    expect(goodStreak({ retention: 97 })[1]!).toBeLessThan(goodStreak({ retention: 80 })[1]!);
  });
});

describe('Leitner', () => {
  it('Fachregeln: Nochmal Fach 1, Schwer bleibt, Gut und Leicht rücken vor, Fach 5 ist das Ende', () => {
    expect(nextBox(4, 1)).toBe(1);
    expect(nextBox(4, 2)).toBe(4);
    expect(nextBox(4, 3)).toBe(5);
    expect(nextBox(3, 4)).toBe(4);
    expect(nextBox(5, 3)).toBe(5);
    expect(nextBox(undefined, 2)).toBe(1);
    expect(nextBox(undefined, 3)).toBe(2);
  });

  it('fällig zu Beginn des Lerntags, die Tage des Fachs später', () => {
    const s = leitnerReview(undefined, 3, NOW, leitnerSettings);
    expect(s.box).toBe(2);
    expect(s.due).toBe(new Date(2026, 8, 28 + 3, 4).getTime());
  });

  it('vor 4 Uhr gilt noch der Vortag als Ausgangspunkt', () => {
    const night = new Date(2026, 8, 28, 2, 0).getTime();
    expect(leitnerReview(undefined, 1, night, leitnerSettings).due).toBe(
      new Date(2026, 8, 28, 4).getTime(),
    );
  });

  it('Vorschau in Tagen je Bewertung; ungültiges Fach fällt auf Fach 1', () => {
    expect(leitnerPreviewDays({ box: 2, due: 0 }, leitnerSettings)).toEqual({
      1: 1,
      2: 3,
      3: 7,
      4: 7,
    });
    expect(boxDays(leitnerSettings, 9)).toBe(1);
  });
});

describe('Lernzustand einer Abfrage', () => {
  it('die erste Bewertung legt beide Zustände an; `due` folgt dem aktiven Algorithmus', () => {
    const fs = reviewItem(fresh(), 3, NOW, fsrsSettings);
    expect(fs.item.fsrs).toBeDefined();
    expect(fs.item.leitner?.box).toBe(2);
    expect(fs.item.due).toBe(fs.item.fsrs?.due);
    expect(fs.item.lastReviewedAt).toBe(NOW);
    const lt = reviewItem(fresh(), 3, NOW, leitnerSettings);
    expect(lt.item.due).toBe(lt.item.leitner?.due);
    expect(lt.item.fsrs).toEqual(fs.item.fsrs);
  });

  it('das Lernlog trägt Bewertung, Herkunft und den Zustand davor', () => {
    const first = reviewItem(fresh(), 3, NOW, fsrsSettings);
    expect(first.log).toMatchObject({
      at: NOW,
      itemId: 'k1',
      rating: 3,
      algorithm: 'fsrs',
      wasNew: true,
      before: {},
    });
    const second = reviewItem(first.item, 1, NOW + DAY, fsrsSettings);
    expect(second.log.wasNew).toBe(false);
    expect(second.log.before).toEqual(snapshotOf(first.item));
  });

  it('Undo: der Vorzustand aus dem Log stellt die Abfrage genau wieder her', () => {
    const a = reviewItem(fresh(), 3, NOW, fsrsSettings);
    const b = reviewItem(a.item, 4, NOW + 2 * DAY, fsrsSettings);
    expect(restoreItem(b.item, b.log.before)).toEqual(a.item);
    const c = reviewItem(fresh(), 2, NOW, fsrsSettings);
    expect(restoreItem(c.item, c.log.before)).toEqual(fresh());
    expect('fsrs' in restoreItem(c.item, c.log.before)).toBe(false);
  });

  it('Algorithmuswechsel ohne Datenverlust: nur der Index `due` ändert sich', () => {
    let item = fresh();
    let now = NOW;
    for (const r of [3, 3, 4, 2, 3] as const) {
      item = reviewItem(item, r, now, fsrsSettings).item;
      now += 3 * DAY;
    }
    const toLeitner = withActiveDue(item, 'leitner');
    expect(toLeitner.due).toBe(item.leitner?.due);
    expect(toLeitner.fsrs).toEqual(item.fsrs);
    expect(toLeitner.leitner).toEqual(item.leitner);
    const back = withActiveDue(toLeitner, 'fsrs');
    expect(back).toEqual(item);
    expect(dueOf(back, 'fsrs')).toBe(item.fsrs?.due);
  });

  it('nach dem Wechsel läuft die Abfrage im neuen Rhythmus weiter, der alte Zustand wächst mit', () => {
    let item = reviewItem(fresh(), 3, NOW, fsrsSettings).item;
    item = withActiveDue(item, 'leitner');
    const after = reviewItem(item, 3, NOW + DAY, leitnerSettings).item;
    expect(after.leitner?.box).toBe(3);
    expect(after.due).toBe(after.leitner?.due);
    expect(after.fsrs?.reps).toBe(2);
  });

  it('eine neue Abfrage hat keinen Index und ist neu', () => {
    expect(isNewItem(fresh())).toBe(true);
    expect(withActiveDue(fresh(), 'fsrs')).toEqual(fresh());
    expect(dueOf(fresh(), 'leitner')).toBeUndefined();
    expect(isNewItem(reviewItem(fresh(), 1, NOW, fsrsSettings).item)).toBe(false);
  });
});

describe('Intervallvorschau', () => {
  it('FSRS, neue Abfrage', () => {
    expect(previewIntervals([fresh()], NOW, fsrsSettings)).toMatchObject({
      again: '1 min',
      hard: '6 min',
      good: '10 min',
    });
  });

  it('Leitner in Tagen', () => {
    expect(previewIntervals([fresh()], NOW, leitnerSettings)).toEqual({
      again: '1 T',
      hard: '1 T',
      good: '3 T',
      easy: '3 T',
    });
  });

  it('bei gebündelten Lücken zählt der kürzeste Abstand', () => {
    const grown = reviewItem(fresh('a'), 4, NOW, fsrsSettings).item;
    const [only] = Object.values(previewIntervals([fresh('b')], NOW, fsrsSettings));
    const both = previewIntervals([grown, fresh('b')], NOW, fsrsSettings);
    expect(both.again).toBe(only);
  });

  it('die Knöpfe zeigen genau den Abstand, der nach dem Tippen gilt', () => {
    let item = reviewItem(fresh(), 4, NOW, fsrsSettings).item;
    const later = NOW + 4 * DAY;
    const preview = previewIntervals([item], later, fsrsSettings);
    item = reviewItem(item, 3, later, fsrsSettings).item;
    expect(formatInterval((item.due ?? 0) - later)).toBe(preview.good);
  });
});

describe('Reife', () => {
  it('neu, im Lernen, sicher', () => {
    expect(maturityOf(fresh(), fsrsSettings)).toBe('fresh');
    const learning = reviewItem(fresh(), 3, NOW, fsrsSettings).item;
    expect(maturityOf(learning, fsrsSettings)).toBe('learning');
    let item = fresh();
    let now = NOW;
    for (let i = 0; i < 6; i += 1) {
      item = reviewItem(item, 4, now, fsrsSettings).item;
      now = item.due ?? now;
    }
    expect(maturityOf(item, fsrsSettings)).toBe('secure');
    expect(maturityOf(item, leitnerSettings)).toBe('secure');
    expect(maturityOf(learning, leitnerSettings)).toBe('learning');
  });
});

describe('Einstellungen', () => {
  it('begrenzt Werte und ergänzt fehlende', () => {
    expect(clampRetention(50)).toBe(80);
    expect(clampRetention(99)).toBe(97);
    expect(clampNewPerDay(-3)).toBe(0);
    expect(clampNewPerDay(140)).toBe(100);
    expect(stepNewPerDay(20, 1)).toBe(25);
    expect(stepNewPerDay(0, -1)).toBe(0);
    expect(stepNewPerDay(100, 1)).toBe(100);
    expect(withDefaults(undefined)).toEqual(DEFAULT_LEARNING);
    expect(withDefaults({ retention: 95 })).toEqual({ ...DEFAULT_LEARNING, retention: 95 });
  });

  it('Leitner-Fächer bleiben aufsteigend', () => {
    const days = DEFAULT_LEARNING.leitnerDays;
    expect(setLeitnerDays(days, 3, 10)).toEqual([1, 3, 10, 14, 30]);
    expect(setLeitnerDays(days, 3, 2)).toEqual([1, 3, 3, 14, 30]);
    expect(setLeitnerDays(days, 3, 99)).toEqual([1, 3, 14, 14, 30]);
    expect(setLeitnerDays(days, 5, 400)).toEqual([1, 3, 7, 14, 180]);
    expect(setLeitnerDays(days, 1, 0)).toEqual(days);
    expect(setLeitnerDays(days, 9, 5)).toEqual(days);
  });
});
