import { describe, expect, it } from 'vitest';
import { SHARE_VARIANTS, createJuriTestBytes, icsFile, inspectBytes } from './testFiles';

const now = new Date('2026-09-28T16:00:00Z');

describe('Testdatei', () => {
  it('ist ein ZIP mit Geräte-Check-Kennung', () => {
    const bytes = createJuriTestBytes(now);
    const info = inspectBytes('Stapel.juri', '', bytes);
    expect(info.isZip).toBe(true);
    expect(info.signature).toBe('50 4b 03 04');
    expect(info.checkFileFound).toBe(true);
    expect(info.error).toBeNull();
  });

  it('erkennt fremde Dateien', () => {
    const info = inspectBytes('bild.png', 'image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    expect(info).toMatchObject({ isZip: false, checkFileFound: false, signature: '89 50 4e 47' });
  });

  it('meldet kaputte ZIP-Dateien, ohne zu werfen', () => {
    const broken = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
    const info = inspectBytes('kaputt.juri', '', broken);
    expect(info.isZip).toBe(true);
    expect(info.checkFileFound).toBe(false);
  });
});

describe('Teilen-Varianten', () => {
  it('haben eindeutige IDs und erzeugen Dateien', () => {
    const ids = SHARE_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const variant of SHARE_VARIANTS) {
      const file = variant.make(now);
      expect(file.size).toBeGreaterThan(0);
      expect(file.name.length).toBeGreaterThan(0);
    }
  });

  it('erzeugt einen Kalendertermin', async () => {
    const file = icsFile(now);
    expect(file.type).toBe('text/calendar');
    expect(await file.text()).toContain('BEGIN:VALARM');
  });
});
