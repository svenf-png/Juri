import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeJuri } from '@/domain/juri/codec';
import { planMerge } from '@/domain/juri/merge';
import { EMPTY_LOCAL, counter } from '@/domain/juri/testkit';
import {
  DEMO_JURI_NAME,
  DEMO_JURI_TIME,
  DEMO_SENDER_ID,
  demoJuriBytes,
  demoJuriPackage,
} from './demoJuri';

const pdf = new Uint8Array(readFileSync('testdaten/demo-skript.pdf'));
const FILE = `testdaten/${DEMO_JURI_NAME.toLowerCase()}`;

describe('Demo-Datei zum Import', () => {
  it('enthält zwei Stapel mit Notizen, Medien und Verknüpfungen', () => {
    const pack = demoJuriPackage(pdf);
    expect(pack.manifest.decks.map((d) => d.id)).toEqual(['demo-amtshaftung', 'demo-schemata']);
    expect(pack.manifest.sender?.name).toBe('Mara');
    expect(pack.manifest.notes).toBe(true);
    expect(pack.cards.filter((c) => c.note !== undefined)).toHaveLength(2);
    expect(pack.media.map((m) => m.kind).sort()).toEqual(['image', 'pdf']);
    const links = pack.cards.flatMap((c) =>
      c.type === 'schema' ? c.points.filter((p) => p.link !== undefined) : [],
    );
    expect(links.length).toBeGreaterThan(0);
    expect(pack.cards.some((c) => c.type === 'cover' && c.source?.mediaId === 'demo-skript')).toBe(
      true,
    );
  });

  it('trägt eine Absender-ID und ein High five (M11)', () => {
    const { manifest } = demoJuriPackage(new Uint8Array([1]));
    expect(manifest.sender).toEqual({ name: 'Mara', id: DEMO_SENDER_ID });
    expect(manifest.highFives).toEqual([
      { id: 'demo-mara-hf-1', at: DEMO_JURI_TIME, win: '12 Tage in Folge' },
    ]);
  });

  it('besteht die Prüfung und ergibt beim Import einen konsistenten Plan', () => {
    const pack = decodeJuri(demoJuriBytes(pdf));
    const plan = planMerge({
      pack,
      local: EMPTY_LOCAL,
      mode: 'update',
      now: DEMO_JURI_TIME,
      newId: counter(),
    });
    expect(plan.summary).toMatchObject({ decksNew: 2, cardsNew: pack.cards.length, mediaNew: 2 });
    expect(plan.conflicts).toEqual([]);
  });

  it('ist deterministisch und entspricht der Datei in testdaten/', () => {
    const bytes = demoJuriBytes(pdf);
    expect(demoJuriBytes(pdf)).toEqual(bytes);
    // Mit JURI_TESTDATEN=1 neu schreiben (npm run demo:juri); sonst muss die Datei stimmen.
    if (process.env.JURI_TESTDATEN === '1') writeFileSync(FILE, bytes);
    expect(new Uint8Array(readFileSync(FILE))).toEqual(bytes);
  });
});
