import { describe, expect, it } from 'vitest';
import { formatBytes } from '../format/bytes';
import {
  checkPixels,
  checkSize,
  checkUpload,
  fitWithin,
  hasRoom,
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_MAX_INPUT_PIXELS,
  PDF_MAX_BYTES,
  problemText,
  sniffMedia,
} from './media';

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => Array.from({ length: text.length }, (_, i) => text.charCodeAt(i));

describe('sniffMedia', () => {
  it('erkennt PDF, JPEG, PNG, GIF und WebP an den ersten Bytes', () => {
    expect(sniffMedia(bytes(...ascii('%PDF-1.7\n')))).toEqual({
      kind: 'pdf',
      mime: 'application/pdf',
    });
    expect(sniffMedia(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg');
    expect(sniffMedia(bytes(0x89, ...ascii('PNG\r\n'), 0x1a, 0x0a))?.mime).toBe('image/png');
    expect(sniffMedia(bytes(...ascii('GIF89a')))?.mime).toBe('image/gif');
    expect(sniffMedia(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))?.mime).toBe(
      'image/webp',
    );
  });

  it('erkennt HEIC und AVIF an der ftyp-Marke', () => {
    const ftyp = (brand: string) => bytes(0, 0, 0, 24, ...ascii('ftyp'), ...ascii(brand));
    expect(sniffMedia(ftyp('heic'))?.mime).toBe('image/heic');
    expect(sniffMedia(ftyp('mif1'))?.mime).toBe('image/heic');
    expect(sniffMedia(ftyp('avif'))?.mime).toBe('image/avif');
    expect(sniffMedia(ftyp('isom'))).toBeNull();
  });

  it('lehnt SVG, Text und Leeres ab', () => {
    expect(sniffMedia(bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg"/>')))).toBeNull();
    expect(sniffMedia(bytes(...ascii('hallo')))).toBeNull();
    expect(sniffMedia(bytes())).toBeNull();
  });
});

describe('checkUpload', () => {
  const pdf = bytes(...ascii('%PDF-1.4'));
  const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0);

  it('nimmt ein passendes PDF und Bild an', () => {
    expect(checkUpload(pdf, 'pdf')).toMatchObject({ ok: true, kind: 'pdf' });
    expect(checkUpload(jpeg, 'image')).toMatchObject({ ok: true, kind: 'image' });
  });

  it('lehnt die falsche Art, Leeres und Unbekanntes ab', () => {
    expect(checkUpload(pdf, 'image')).toEqual({ ok: false, problem: { code: 'unbekannt' } });
    expect(checkUpload(jpeg, 'pdf')).toEqual({ ok: false, problem: { code: 'unbekannt' } });
    expect(checkUpload(bytes(), 'pdf')).toEqual({ ok: false, problem: { code: 'leer' } });
    expect(checkUpload(bytes(1, 2, 3), 'image')).toEqual({
      ok: false,
      problem: { code: 'unbekannt' },
    });
  });

  it('lehnt zu große Dateien ab', () => {
    const big = new Uint8Array(PDF_MAX_BYTES + 1);
    big.set(ascii('%PDF-'));
    expect(checkUpload(big, 'pdf')).toEqual({
      ok: false,
      problem: { code: 'zu-gross', limit: PDF_MAX_BYTES, size: PDF_MAX_BYTES + 1 },
    });
  });
});

describe('checkSize und checkPixels', () => {
  it('prüft die Größe vor dem Lesen', () => {
    expect(checkSize(0, 'image')).toEqual({ code: 'leer' });
    expect(checkSize(1000, 'image')).toBeNull();
    expect(checkSize(IMAGE_MAX_INPUT_BYTES + 1, 'image')).toMatchObject({ code: 'zu-gross' });
    expect(checkSize(PDF_MAX_BYTES, 'pdf')).toBeNull();
    expect(checkSize(PDF_MAX_BYTES + 1, 'pdf')).toMatchObject({ limit: PDF_MAX_BYTES });
  });

  it('begrenzt die Bildpunkte', () => {
    expect(checkPixels(4000, 3000)).toBeNull();
    expect(checkPixels(IMAGE_MAX_INPUT_PIXELS, 2)).toMatchObject({ code: 'zu-viele-pixel' });
  });
});

describe('fitWithin', () => {
  it('lässt kleine Bilder unverändert und verkleinert große mit Seitenverhältnis', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it('bleibt bei extremen Formaten mindestens einen Bildpunkt breit', () => {
    expect(fitWithin(100_000, 10, 2000)).toEqual({ width: 2000, height: 1 });
  });
});

describe('hasRoom', () => {
  it('rechnet mit doppelter Größe plus Reserve', () => {
    expect(hasRoom(10_000_000, { usage: 0, quota: 30_000_000 })).toBe(true);
    expect(hasRoom(10_000_000, { usage: 6_000_000, quota: 30_000_000 })).toBe(false);
  });

  it('nimmt ausreichenden Speicher an, wenn der Browser nichts meldet', () => {
    expect(hasRoom(10_000_000, {})).toBe(true);
    expect(hasRoom(10_000_000, { usage: 1 })).toBe(true);
  });
});

describe('problemText', () => {
  const texts = () =>
    [
      { code: 'leer' },
      { code: 'unbekannt' },
      { code: 'zu-gross', limit: 50_000_000, size: 80_000_000 },
      { code: 'zu-viele-pixel', pixels: 200_000_000 },
      { code: 'speicher-voll' },
      { code: 'pdf-passwort' },
      { code: 'pdf-unlesbar' },
      { code: 'pdf-zu-viele-seiten', limit: 1000 },
    ] as const;

  it('nennt Grund und Zahlen ohne Gedankenstriche', () => {
    for (const kind of ['image', 'pdf'] as const) {
      for (const problem of texts()) {
        const { title, text } = problemText(problem, kind, formatBytes);
        expect(title).not.toBe('');
        expect(`${title} ${text}`).not.toMatch(/[–—]/);
      }
    }
    expect(
      problemText({ code: 'zu-gross', limit: 50_000_000, size: 80_000_000 }, 'pdf', formatBytes)
        .text,
    ).toContain('80,0 MB');
  });

  it('unterscheidet Bild und PDF', () => {
    expect(problemText({ code: 'unbekannt' }, 'pdf', formatBytes).text).toContain('kein PDF');
    expect(problemText({ code: 'unbekannt' }, 'image', formatBytes).text).toContain('JPEG');
  });
});
