import { describe, expect, it } from 'vitest';
import { prepareRestore } from '@/data/backup';
import { schemaVersion } from '@/data/migrations';
import { demoLargeTables, LARGE_CARD_COUNT, LARGE_DECK_COUNT } from './demoLarge';

describe('Großer Datensatz', () => {
  const now = new Date(2026, 8, 28, 12).getTime();

  it('hat 5.000 Karten in 50 Stapeln und ist gültig wie ein Backup', () => {
    const large = demoLargeTables(now);
    expect(large.cards).toBe(LARGE_CARD_COUNT);
    expect(large.decks).toBe(LARGE_DECK_COUNT);
    // 70 % Frage (1 Abfrage), 20 % Lücke (2 Abfragen), 10 % Schema (1 Abfrage).
    expect(large.items).toBe(3500 + 2 * 1000 + 500);
    const tables = prepareRestore({
      schemaVersion: schemaVersion(),
      createdAt: now,
      app: { instance: 'test', version: '0' },
      tables: large.tables,
    });
    expect(tables.cards).toHaveLength(5000);
    expect(tables.reviewLog?.length).toBe(large.reviews);
  });

  it('ist deterministisch und lässt einen Teil heute fällig, einen Teil neu', () => {
    expect(demoLargeTables(now)).toEqual(demoLargeTables(now));
    const items = (demoLargeTables(now).tables.reviewItems ?? []) as { due?: number }[];
    const neu = items.filter((item) => item.due === undefined).length;
    const faellig = items.filter((item) => item.due !== undefined && item.due <= now).length;
    expect(neu).toBeGreaterThan(items.length * 0.2);
    expect(faellig).toBeGreaterThan(100);
  });

  it('bleibt bei kleiner Kartenzahl gültig', () => {
    const small = demoLargeTables(now, 30);
    expect(small.cards).toBe(30);
    expect(small.decks).toBe(30);
  });
});
