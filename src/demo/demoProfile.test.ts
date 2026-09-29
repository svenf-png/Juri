import { describe, expect, it } from 'vitest';
import { prepareRestore } from '@/data/backup';
import { schemaVersion } from '@/data/migrations';
import { activeDeadlines } from '@/domain/deadlines/effective';
import { deadlineStatus } from '@/domain/deadlines/status';
import { learningDay } from '@/domain/calendar/day';
import { demoDeadlines, demoTables } from './demoProfile';

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
});
