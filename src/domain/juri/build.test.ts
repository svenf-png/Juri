import { describe, expect, it } from 'vitest';
import { buildPackage, juriFileName } from './build';
import { NOW, SOURCE, cover, deck, pack, qa, schema } from './testkit';

describe('buildPackage', () => {
  it('nimmt nur die gewählten Stapel mit und keine Lernzustände', () => {
    const p = pack(['deck-a']);
    expect(p.decks.map((d) => d.id)).toEqual(['deck-a']);
    expect(p.cards.every((c) => c.deckId === 'deck-a')).toBe(true);
    expect(JSON.stringify(p)).not.toContain('leitner');
    expect(p.manifest.counts).toEqual({ cards: 4, media: 2 });
  });

  it('schickt Notizen nur mit Schalter', () => {
    const off = pack(['deck-b'], { notes: false });
    const on = pack(['deck-b'], { notes: true });
    expect(off.cards.some((c) => c.note !== undefined)).toBe(false);
    expect(off.manifest.notes).toBe(false);
    expect(on.cards.find((c) => c.id === 'c3')?.note).toBe('meine Notiz');
    expect(on.manifest.notes).toBe(true);
  });

  it('gibt den Herkunftsstand nie weiter', () => {
    const source = {
      ...SOURCE,
      cards: [qa('c1', 'deck-a', 'F', { originHash: '0123456789abcdef' })],
      media: [],
    };
    const p = buildPackage(source, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: null,
      now: NOW,
      appVersion: '0.11.0',
    }).pack;
    expect(p.cards[0]?.originHash).toBeUndefined();
  });

  it('lässt Verknüpfungen zu nicht mitgeschickten Karten weg und zählt sie', () => {
    const source = {
      ...SOURCE,
      cards: [schema('s1', 'deck-a', ['c9', 'c1']), qa('c1', 'deck-a'), qa('c9', 'deck-b')],
      media: [],
    };
    const result = buildPackage(source, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: null,
      now: NOW,
      appVersion: '0.11.0',
    });
    const s = result.pack.cards.find((c) => c.type === 'schema');
    expect(s?.type === 'schema' && s.points.map((p) => p.link)).toEqual([undefined, 'c1']);
    expect(result.linksDropped).toBe(1);
  });

  it('überspringt eine Abdeckung ohne Bild und entfernt das fehlende PDF der Herkunft', () => {
    const source = {
      ...SOURCE,
      cards: [
        cover('m1', 'deck-a', 'fehlt'),
        qa('c1', 'deck-a', 'F', { source: { name: 'X.pdf', page: 2, mediaId: 'auch-weg' } }),
      ],
      media: [],
    };
    const result = buildPackage(source, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: null,
      now: NOW,
      appVersion: '0.11.0',
    });
    expect(result.skipped).toBe(1);
    expect(result.pack.cards).toHaveLength(1);
    expect(result.pack.cards[0]?.source).toEqual({ name: 'X.pdf', page: 2 });
  });

  it('nimmt Erfolge nur mit Snapshot mit und behält die Reihenfolge der Stapel', () => {
    const r = buildPackage(SOURCE, {
      deckIds: ['deck-b', 'deck-a'],
      notes: false,
      achievements: { streak: 1, reviews: 2, created: 3, milestones: [] },
      senderName: 'Mara',
      now: NOW,
      appVersion: '0.11.0',
    });
    expect(r.pack.manifest.decks.map((d) => d.id)).toEqual(['deck-b', 'deck-a']);
    expect(r.pack.manifest.achievements?.reviews).toBe(2);
    expect(r.pack.manifest.sender?.name).toBe('Mara');
    expect(r.cardIds).toContain('c3');
  });

  it('nutzt ein Ersatz-Rechtsgebiet, wenn ein Stapel keines mehr hat', () => {
    const source = { ...SOURCE, decks: [deck('deck-a', 'X', ['weg'])], cards: [], media: [] };
    const p = buildPackage(source, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: null,
      now: NOW,
      appVersion: '0.11.0',
    }).pack;
    expect(p.decks[0]?.areas).toEqual([{ code: 'SO', name: 'Sonstiges' }]);
  });

  it('verlangt mindestens einen vorhandenen Stapel', () => {
    expect(() => pack(['gibt-es-nicht'])).toThrow(RangeError);
    expect(() => pack([])).toThrow(RangeError);
  });
});

describe('juriFileName', () => {
  it('nennt die Datei wie den Stapel', () => {
    expect(juriFileName(['Amtshaftung'], NOW)).toBe('Amtshaftung.juri');
  });
  it('entfernt Zeichen, die Dateisysteme nicht mögen', () => {
    expect(juriFileName(['A/B: "C"?'], NOW)).toBe('A B C.juri');
  });
  it('fällt bei mehreren Stapeln oder unbrauchbarem Namen auf das Datum zurück', () => {
    expect(juriFileName(['A', 'B'], NOW)).toMatch(/^Juri-Stapel-2026-09-\d\d\.juri$/);
    expect(juriFileName(['..'], NOW)).toMatch(/^Juri-Stapel-/);
    expect(juriFileName([], NOW)).toMatch(/^Juri-Stapel-/);
  });
  it('kürzt sehr lange Namen', () => {
    expect(juriFileName(['x'.repeat(200)], NOW).length).toBeLessThanOrEqual(66);
  });
});
