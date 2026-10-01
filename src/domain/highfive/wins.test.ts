import { describe, expect, it } from 'vitest';
import type { Achievements } from '../model/records';
import { nextWin, seedCelebrated, winsOf } from './wins';

const base: Achievements = { streak: 0, reviews: 0, created: 0, milestones: [] };

describe('Erfolge eines Kontakts', () => {
  it('ohne Zahlen gibt es nichts zu feiern', () => {
    expect(winsOf(base)).toEqual([]);
    expect(nextWin(undefined, [])).toBeNull();
    expect(nextWin(base, [])).toBeNull();
  });

  it('Serie ab drei Tagen, Karten und Wiederholungen in Stufen', () => {
    expect(winsOf({ ...base, streak: 2 })).toEqual([]);
    expect(winsOf({ ...base, streak: 12 })).toEqual([
      { key: 'streak:12', text: '12 Tage in Folge', sentence: 'hat 12 Tage in Folge geschafft' },
    ]);
    expect(winsOf({ ...base, created: 99 })).toEqual([]);
    expect(winsOf({ ...base, created: 249 })).toEqual([
      { key: 'created:200', text: '200 Karten angelegt', sentence: 'hat 200 Karten angelegt' },
    ]);
    expect(winsOf({ ...base, reviews: 1999 })[0]).toEqual({
      key: 'reviews:1000',
      text: '1.000 Wiederholungen',
      sentence: 'hat 1.000 Wiederholungen geschafft',
    });
  });

  it('Reihenfolge: Meilenstein vor Wiederholungen vor Karten vor Serie', () => {
    const all: Achievements = {
      streak: 12,
      reviews: 1500,
      created: 200,
      milestones: ['erste-karte', 'teamplayer'],
    };
    expect(winsOf(all).map((w) => w.key)).toEqual([
      'm:teamplayer',
      'm:erste-karte',
      'reviews:1000',
      'created:200',
      'streak:12',
    ]);
  });

  it('der nächste Anlass überspringt Gefeiertes; unbekannte Meilensteine zählen nicht', () => {
    const a: Achievements = { ...base, streak: 12, created: 200, milestones: ['gibt-es-nicht'] };
    expect(nextWin(a, [])?.key).toBe('created:200');
    expect(nextWin(a, ['created:200'])?.key).toBe('streak:12');
    expect(nextWin(a, ['created:200', 'streak:12'])).toBeNull();
  });

  it('beim Kennenlernen zählen erreichte Meilensteine als gefeiert, Zahlen bleiben offen', () => {
    const a: Achievements = { streak: 12, reviews: 0, created: 0, milestones: ['erste-karte'] };
    const celebrated = seedCelebrated(a);
    expect(celebrated).toEqual(['m:erste-karte']);
    expect(nextWin(a, celebrated)?.key).toBe('streak:12');
    expect(seedCelebrated(undefined)).toEqual([]);
  });
});
