import { describe, expect, it } from 'vitest';
import type { ReviewItem } from '../model/records';
import {
  AGAIN_GAP,
  againPosition,
  canUndo,
  counter,
  current,
  flip,
  gapSubs,
  isBundle,
  itemCount,
  progressPercent,
  rate,
  revealNext,
  startSession,
  stationsFrom,
  summary,
  undo,
  type SessionState,
  type Station,
} from './session';

const item = (cardId: string, sub = ''): ReviewItem => ({
  id: sub === '' ? cardId : `${cardId}:${sub}`,
  cardId,
  deckId: 'd',
  sub,
  createdAt: 1,
});
const station = (key: string): Station => ({ key, cardId: key, itemIds: [key] });
const start = (...keys: string[]) => startSession(keys.map(station));

function ratedOk(state: SessionState, r: Parameters<typeof rate>[1]): SessionState {
  const flipped = flip(state);
  const out = rate(flipped, r);
  if (!out) throw new Error('nicht bewertbar');
  return out.state;
}

describe('stationsFrom', () => {
  it('Fragen einzeln, Lücken einer Karte gebündelt an der Stelle der ersten', () => {
    const items = [item('a'), item('c', 'c2'), item('b'), item('c', 'c1'), item('c', 'c10')];
    const stations = stationsFrom(items);
    expect(stations.map((s) => s.key)).toEqual(['a', 'c', 'b']);
    expect(stations[1]!.itemIds).toEqual(['c:c1', 'c:c2', 'c:c10']);
    expect(isBundle(stations[1])).toBe(true);
    expect(isBundle(stations[0])).toBe(false);
    expect(isBundle(undefined)).toBe(false);
    expect(itemCount(stations)).toBe(5);
  });

  it('eine einzelne fällige Lücke ist eine normale Station', () => {
    expect(isBundle(stationsFrom([item('c', 'c3')])[0])).toBe(false);
  });

  it('nennt die Lücken-Kennungen eines Textes', () => {
    expect(gapSubs('{{c2::a}} und {{c1::b}}')).toEqual(['c1', 'c2']);
  });
});

describe('Ablauf', () => {
  it('leere Session ist sofort fertig', () => {
    expect(startSession([]).done).toBe(true);
    expect(progressPercent(startSession([]))).toBe(0);
  });

  it('Zähler und Leiste laufen mit den abgeschlossenen Stationen', () => {
    let s = start('a', 'b', 'c', 'd');
    expect(counter(s)).toBe('1/4');
    expect(progressPercent(s)).toBe(0);
    s = ratedOk(s, 'good');
    expect(counter(s)).toBe('2/4');
    expect(progressPercent(s)).toBe(25);
    s = ratedOk(ratedOk(ratedOk(s, 'easy'), 'hard'), 'good');
    expect(s.done).toBe(true);
    expect(counter(s)).toBe('4/4');
    expect(progressPercent(s)).toBe(100);
  });

  it('bewerten geht nur mit aufgedeckter Antwort', () => {
    const s = start('a');
    expect(rate(s, 'good')).toBeNull();
    expect(current(flip(s))?.key).toBe('a');
    expect(flip(flip(s))).toEqual(flip(s));
    expect(rate(startSession([]), 'good')).toBeNull();
    expect(flip(startSession([]))).toEqual(startSession([]));
  });

  it('die Bewertung meldet, was zu speichern ist', () => {
    const out = rate(flip(start('a', 'b')), 'hard')!;
    expect(out.effect).toEqual({ itemIds: ['a'], rating: 'hard' });
    expect(current(out.state)?.key).toBe('b');
    expect(out.state.flipped).toBe(false);
  });

  it('Nochmal: die Karte kommt nach drei anderen wieder, bis sie mindestens Schwer bekommt (A4)', () => {
    let s = start('a', 'b', 'c', 'd', 'e');
    s = ratedOk(s, 'again');
    expect(s.queue.map((x) => x.key)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(s.finished).toBe(0);
    s = ratedOk(ratedOk(ratedOk(s, 'good'), 'good'), 'good');
    expect(current(s)?.key).toBe('a');
    s = ratedOk(s, 'again');
    expect(s.queue.map((x) => x.key)).toEqual(['e', 'a']);
    s = ratedOk(s, 'good');
    expect(s.queue.map((x) => x.key)).toEqual(['a']);
    s = ratedOk(s, 'hard');
    expect(s.done).toBe(true);
    expect(s.finished).toBe(5);
    expect(s.counts).toEqual({ again: 2, hard: 1, good: 4, easy: 0 });
  });

  it('bei weniger als drei übrigen kommt sie ans Ende', () => {
    expect(againPosition(2)).toBe(2);
    expect(againPosition(0)).toBe(0);
    expect(againPosition(9)).toBe(AGAIN_GAP);
    const s = ratedOk(start('a', 'b'), 'again');
    expect(s.queue.map((x) => x.key)).toEqual(['b', 'a']);
    const single = ratedOk(start('a'), 'again');
    expect(single.queue.map((x) => x.key)).toEqual(['a']);
    expect(single.done).toBe(false);
  });

  it('Zusammenfassung zählt jede Bewertung', () => {
    const s = ratedOk(ratedOk(ratedOk(start('a', 'b'), 'again'), 'good'), 'easy');
    expect(summary(s)).toEqual({
      reviews: 3,
      again: 1,
      counts: { again: 1, hard: 0, good: 1, easy: 1 },
    });
  });
});

describe('gebündelte Lücken', () => {
  const bundle: Station = { key: 'c', cardId: 'c', itemIds: ['c:c1', 'c:c2', 'c:c3'] };

  it('werden Lücke für Lücke aufgedeckt, erst danach ist bewertbar', () => {
    let s = startSession([bundle]);
    s = revealNext(s);
    expect(s.revealed).toBe(1);
    expect(s.flipped).toBe(false);
    expect(rate(s, 'good')).toBeNull();
    s = revealNext(revealNext(s));
    expect(s.flipped).toBe(true);
    expect(revealNext(s)).toEqual(s);
    expect(revealNext(startSession([]))).toEqual(startSession([]));
  });

  it('„Alle zeigen“ deckt alles auf; eine Bewertung gilt für jede Lücke einzeln', () => {
    const s = flip(startSession([bundle]));
    expect(s.revealed).toBe(3);
    const out = rate(s, 'good')!;
    expect(out.effect.itemIds).toEqual(['c:c1', 'c:c2', 'c:c3']);
    expect(out.state.ratedItems).toBe(3);
    expect(out.state.counts.good).toBe(3);
  });
});

describe('Undo', () => {
  it('stellt Zähler, Warteschlange und aufgedeckte Antwort wieder her', () => {
    const s0 = start('a', 'b', 'c');
    const s1 = ratedOk(s0, 'good');
    const out = undo(s1)!;
    expect(out.effect.itemIds).toEqual(['a']);
    expect(out.state.queue).toEqual(s0.queue);
    expect(out.state.flipped).toBe(true);
    expect(out.state.finished).toBe(0);
    expect(out.state.counts).toEqual(s0.counts);
    expect(out.state.history).toHaveLength(0);
    expect(canUndo(out.state)).toBe(false);
  });

  it('mehrere Schritte zurück, auch über ein Nochmal', () => {
    let s = start('a', 'b', 'c', 'd');
    s = ratedOk(s, 'again');
    s = ratedOk(s, 'good');
    expect(canUndo(s)).toBe(true);
    s = undo(s)!.state;
    expect(s.queue.map((x) => x.key)).toEqual(['b', 'c', 'd', 'a']);
    s = undo(s)!.state;
    expect(s.queue.map((x) => x.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(undo(s)).toBeNull();
  });

  it('nach der letzten Karte zurück heißt: nicht mehr fertig', () => {
    const done = ratedOk(start('a'), 'good');
    expect(done.done).toBe(true);
    expect(undo(done)!.state.done).toBe(false);
  });
});
