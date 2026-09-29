import { describe, expect, it } from 'vitest';
import { prepareRestore } from '@/data/backup';
import { schemaVersion } from '@/data/migrations';
import { activeDeadlines } from '@/domain/deadlines/effective';
import { deadlineStatus } from '@/domain/deadlines/status';
import { learningDay } from '@/domain/calendar/day';
import { streak } from '@/domain/progress/streak';
import { dayStats } from '@/domain/progress/stats';
import type { DayRow } from '@/domain/model/records';
import { demoDayReviews, demoDeadlines, demoTables } from './demoProfile';

describe('Demo-Profil', () => {
  const now = new Date(2026, 8, 28, 12).getTime();

  it('ist deterministisch und gültig wie ein Backup', () => {
    expect(demoTables(now)).toEqual(demoTables(now));
    const tables = prepareRestore({
      schemaVersion: schemaVersion(),
      createdAt: now,
      app: { instance: 'test', version: '0' },
      tables: demoTables(now),
    });
    expect(tables.profile).toEqual([
      expect.objectContaining({ name: 'Demo', createdAt: now - 182 * 86_400_000 }),
    ]);
  });

  it('hat drei Fristen: eine im Endspurt, eine später, eine ohne Datum', () => {
    const list = demoDeadlines(now);
    const today = learningDay(new Date(now));
    expect(list.map((d) => d.id)).toEqual([
      'demo-frist-klausur',
      'demo-frist-llm',
      'demo-frist-examen',
    ]);
    expect(activeDeadlines(list, today)).toHaveLength(2);
    const world = { decks: [], cardTags: new Map<string, string[]>() };
    expect(deadlineStatus(list[0]!, [], world, today)).toMatchObject({
      phase: 'sprint',
      daysLeft: 5,
    });
    expect(deadlineStatus(list[1]!, [], world, today)).toMatchObject({
      phase: 'upcoming',
      daysLeft: 109,
    });
    expect(deadlineStatus(list[2]!, [], world, today).phase).toBe('undated');
  });

  describe('Lernverlauf (M9)', () => {
    const tables = demoTables(now);
    const rows = tables.dayStats as unknown as DayRow[];
    const today = learningDay(new Date(now));

    it('deckt 26 Wochen ab, stimmt mit dem Ereignis-Log überein und hat einen Rekordtag', () => {
      const first = rows[0]?.day ?? '';
      expect(first >= '2026-03-29').toBe(true);
      const fromLog = dayStats(tables.events as never);
      expect(rows.map((r) => [r.day, r.reviews, r.learned, r.created])).toEqual(
        [...fromLog]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([day, s]) => [day, s.reviews, s.learned, s.created]),
      );
      const best = [...rows].sort((a, b) => b.reviews - a.reviews)[0];
      expect(best).toMatchObject({ reviews: 86, day: '2026-09-20' });
      expect(rows.find((r) => r.day === '2026-09-28')).toMatchObject({ learned: 6, met: false });
    });

    it('hat eine laufende Serie mit Pausentagen und offene Ziele bis zu den nächsten Meilensteinen', () => {
      const met = new Map(rows.map((r) => [r.day, r.met]));
      const result = streak({ met, today, pause: true, available: () => true });
      expect(result.current).toBeGreaterThanOrEqual(7);
      expect(result.current).toBeLessThan(30);
      const withoutPause = streak({ met, today, pause: false, available: () => true });
      expect(withoutPause.current).toBeLessThan(result.current);
      const ids = (tables.milestones ?? []).map((m) => m.id);
      expect(ids).toContain('erste-karte');
      expect(ids).toContain('serie-7');
      expect(ids).toContain('wiederholungen-1000');
      expect(ids).not.toContain('angelegt-100');
      expect(ids).not.toContain('serie-30');
    });

    it('lässt einen Meilenstein zur Feier offen', () => {
      const unseen = (tables.milestones ?? []).filter((m) => m.seen === false).map((m) => m.id);
      expect(unseen).toEqual(['wiederholungen-1000']);
    });

    it('an einem Tag nur Bewertungen für Abfragen, die es schon gab', () => {
      const items = new Map(
        (tables.reviewItems ?? []).map((i) => [i.id as string, i.createdAt as number]),
      );
      for (const e of tables.events ?? []) {
        if (e.type === 'reviewed')
          expect(e.at as number).toBeGreaterThanOrEqual(items.get(e.itemId as string) ?? 0);
      }
    });

    it('der Tagesplan ist deterministisch', () => {
      const a = demoDayReviews(30, () => 0.5);
      expect(a).toBe(demoDayReviews(30, () => 0.5));
      expect(demoDayReviews(0, () => 0.9)).toBe(6);
      expect(demoDayReviews(8, () => 0.9)).toBe(86);
      expect(demoDayReviews(3, () => 0.9)).toBe(0);
    });
  });
});
