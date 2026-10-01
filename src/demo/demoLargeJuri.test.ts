import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPackage } from '@/domain/juri/build';
import { decodeJuri, encodeJuri } from '@/domain/juri/codec';
import { JURI_LIMITS } from '@/domain/juri/format';
import { planMerge } from '@/domain/juri/merge';
import type { Area, Card, Deck, ReviewItem } from '@/domain/model/records';
import { demoLargeTables } from './demoLarge';

/*
 * Gegenprüfung der Grenzen aus A69 mit dem großen Datensatz (M12, A90): 5.000 Karten in 50
 * Stapeln, die Obergrenzen der Datei, passen gerade hinein. Gemessen wird die reine Logik
 * (Kodieren, Prüfen, Abgleich) ohne Datenbank; die Grenzen hier sind großzügig, sie fangen
 * Ausreißer, keine Millisekunden.
 */

const now = new Date(2026, 8, 28, 12).getTime();

function timed<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const value = fn();
  return [value, performance.now() - start];
}

describe('5.000 Karten als .juri', () => {
  const large = demoLargeTables(now);
  const decks = large.tables.decks as unknown as Deck[];
  const areas = large.tables.areas as unknown as Area[];
  const cards = large.tables.cards as unknown as Card[];
  const items = large.tables.reviewItems as unknown as ReviewItem[];

  it('passt in die Grenzen: Einträge, Größe, Verhältnis; Kodieren und Prüfen bleiben schnell', () => {
    const [built, tBuild] = timed(() =>
      buildPackage(
        { decks, areas, cards, media: [] },
        {
          deckIds: decks.map((d) => d.id),
          notes: false,
          achievements: null,
          now,
          appVersion: '1.0.0',
        },
      ),
    );
    expect(built.pack.cards).toHaveLength(JURI_LIMITS.maxCards);
    expect(built.pack.decks).toHaveLength(JURI_LIMITS.maxDecks);
    const [bytes, tEncode] = timed(() => encodeJuri(built.pack));
    const [decoded, tDecode] = timed(() => decodeJuri(bytes));
    expect(decoded.cards).toHaveLength(5000);
    const raw = JSON.stringify({ decks: decoded.decks, cards: decoded.cards, media: [] }).length;
    const ratio = raw / bytes.length;
    // cards.json bleibt weit unter dem Limit von 20 MB und das Verhältnis unter 1/4 der Grenze.
    expect(raw).toBeLessThan(JURI_LIMITS.maxJsonBytes / 4);
    expect(ratio).toBeLessThan(JURI_LIMITS.maxRatio / 4);
    expect(tBuild + tEncode + tDecode).toBeLessThan(5_000);
    if (process.env.JURI_MESSUNG) {
      writeFileSync(
        process.env.JURI_MESSUNG,
        JSON.stringify({
          bytes: bytes.length,
          rawJsonBytes: raw,
          ratio: Math.round(ratio * 10) / 10,
          build: Math.round(tBuild),
          encode: Math.round(tEncode),
          decode: Math.round(tDecode),
        }),
      );
    }
  });

  it('gleicht 5.000 Karten mit dem lokalen Stand ab (Aktualisieren und Als Kopie)', () => {
    const built = buildPackage(
      { decks, areas, cards, media: [] },
      {
        deckIds: decks.map((d) => d.id),
        notes: false,
        achievements: null,
        now,
        appVersion: '1.0.0',
      },
    );
    const local = {
      decks,
      areas,
      cards,
      items,
      media: [],
      knownCardIds: new Set(cards.map((c) => c.id)),
    };
    let n = 0;
    const newId = () => `neu-${String(++n)}`;
    const [update, tUpdate] = timed(() =>
      planMerge({ pack: built.pack, local, mode: 'update', now, newId }),
    );
    const [copy, tCopy] = timed(() =>
      planMerge({ pack: built.pack, local, mode: 'copy', now, newId }),
    );
    expect(update.conflicts).toHaveLength(0);
    expect(copy.writes.cards.length).toBeGreaterThan(0);
    expect(tUpdate + tCopy).toBeLessThan(5_000);
    if (process.env.JURI_MESSUNG) {
      writeFileSync(
        `${process.env.JURI_MESSUNG}.merge`,
        JSON.stringify({ update: Math.round(tUpdate), copy: Math.round(tCopy) }),
      );
    }
  });
});
