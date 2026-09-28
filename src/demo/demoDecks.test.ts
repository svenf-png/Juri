import { describe, expect, it } from 'vitest';
import { cardSchema } from '@/domain/model/records';
import { clozeNumbers } from '@/domain/cards/cloze';
import { demoDeckTables, demoDecks } from './demoDecks';

const now = new Date(2026, 8, 28, 12).getTime();

describe('Demo-Stapel', () => {
  const demo = demoDecks(now);

  it('umfassen 5 Stapel in 3 Rechtsgebieten, einer liegt in zwei (m:n)', () => {
    expect(demo.areas.map((a) => a.code)).toEqual(['ZR', 'SR', 'ÖR']);
    expect(demo.decks.map((d) => d.name)).toEqual([
      'Deliktsrecht (Demo)',
      'ZPO: Versäumnisurteil (Demo)',
      'Amtshaftung (Demo)',
      'Diebstahl und Betrug (Demo)',
      'VwGO: Anfechtungsklage (Demo)',
    ]);
    const amt = demo.decks.find((d) => d.id === 'demo-amtshaftung');
    expect(amt?.areaIds).toEqual(['demo-zr', 'demo-oer']);
    expect(demo.decks.filter((d) => d.areaIds.length > 1)).toHaveLength(1);
  });

  it('haben nur gültige Karten beider Typen und je Lücke eine Abfrage', () => {
    expect(demo.cards).toHaveLength(35);
    for (const card of demo.cards) expect(cardSchema.safeParse(card).success).toBe(true);
    expect(new Set(demo.cards.map((c) => c.type))).toEqual(new Set(['qa', 'cloze']));
    const gaps = demo.cards.flatMap((c) =>
      c.type === 'cloze' ? [clozeNumbers(c.text).length] : [],
    );
    expect(gaps.some((n) => n === 3)).toBe(true);
    expect(demo.items).toHaveLength(35 - gaps.length + gaps.reduce((a, b) => a + b, 0));
    expect(demo.events).toHaveLength(35);
  });

  it('sind gekennzeichnet und noch nicht fachlich geprüft', () => {
    expect(demo.decks.every((d) => d.name.endsWith('(Demo)'))).toBe(true);
    expect(demo.cards.every((c) => c.tags.includes('Demo'))).toBe(true);
  });

  it('sind deterministisch und haben feste IDs', () => {
    expect(demoDecks(now)).toEqual(demo);
    expect(demo.cards[0]?.id).toBe('demo-deliktsrecht-01');
    expect(new Set(demo.cards.map((c) => c.id)).size).toBe(35);
  });

  it('benutzen vorhandene Rechtsgebiete und überspringen vorhandene Stapel', () => {
    const own = { id: 'meins', code: 'ZR', name: 'Zivilrecht', createdAt: 1, updatedAt: 1 };
    const again = demoDecks(now, { areas: [own], deckIds: new Set(['demo-deliktsrecht']) });
    expect(again.areas.map((a) => a.code)).toEqual(['SR', 'ÖR']);
    expect(again.decks.map((d) => d.id)).not.toContain('demo-deliktsrecht');
    expect(again.decks.find((d) => d.id === 'demo-amtshaftung')?.areaIds).toEqual([
      'meins',
      'demo-oer',
    ]);
    expect(again.cards.every((c) => c.deckId !== 'demo-deliktsrecht')).toBe(true);
  });
});

describe('Demo-Profil mit Karten', () => {
  it('verteilt die Stapel über 26 Wochen, der letzte ist jung, Ereignisse laufen aufsteigend', () => {
    const tables = demoDeckTables(now);
    const created = tables.decks!.map((d) => d.createdAt as number);
    expect(created).toEqual([...created].sort((a, b) => a - b));
    expect(now - created[0]!).toBe(26 * 7 * 86_400_000);
    expect(now - created.at(-1)!).toBe(2 * 86_400_000);
    const seqs = tables.events!.map((e) => e.seq as number);
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
    const ats = tables.events!.map((e) => e.at as number);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
  });
});
