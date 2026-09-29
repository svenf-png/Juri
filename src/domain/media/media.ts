/**
 * Bilder und PDFs (M6, ADR-010): erkennen, prüfen, verkleinern. Reine Funktionen; Dekodieren,
 * Kodieren und Speichern liegen in `platform/` und `data/`.
 *
 * Die Grenzen sind vorsichtige Annahmen für iOS, keine gemessenen Werte: Der Gerätetest
 * (docs/geraete-testliste.md) prüft sie mit echten Dateien.
 */

export type MediaKind = 'image' | 'pdf';

/** Längste Kante eines gespeicherten Bildes in Pixeln (Architektur, Abschnitt HEIC). */
export const IMAGE_MAX_EDGE = 2000;
/** JPEG-Qualität beim Verkleinern. */
export const IMAGE_QUALITY = 0.85;
/** Größte Eingabedatei eines Bildes vor dem Verkleinern. */
export const IMAGE_MAX_INPUT_BYTES = 40_000_000;
/** Größte Pixelzahl eines Bildes vor dem Verkleinern (Dekodieren braucht ca. 4 Byte je Pixel). */
export const IMAGE_MAX_INPUT_PIXELS = 120_000_000;
/** Größtes PDF, das Juri speichert. */
export const PDF_MAX_BYTES = 50_000_000;
/** Höchstzahl der Seiten eines gespeicherten PDFs. */
export const PDF_MAX_PAGES = 1000;
/** Pixel je Zeichenfläche beim Rendern einer PDF-Seite (iOS begrenzt die Fläche, siehe pdfPlan.ts). */
export const CANVAS_MAX_PIXELS = 12_000_000;

/** Typ nach den ersten Bytes, nicht nach Dateiendung oder MIME-Typ der Auswahl. */
export function sniffMedia(bytes: Uint8Array): { kind: MediaKind; mime: string } | null {
  const at = (i: number) => bytes[i] ?? -1;
  const ascii = (from: number, text: string) =>
    Array.from({ length: text.length }, (_, i) => text.charCodeAt(i)).every(
      (code, i) => at(from + i) === code,
    );
  // %PDF- darf laut Spezifikation in den ersten 1024 Bytes stehen; wir verlangen den Anfang.
  if (ascii(0, '%PDF-')) return { kind: 'pdf', mime: 'application/pdf' };
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff)
    return { kind: 'image', mime: 'image/jpeg' };
  if (at(0) === 0x89 && ascii(1, 'PNG\r\n') && at(6) === 0x1a && at(7) === 0x0a) {
    return { kind: 'image', mime: 'image/png' };
  }
  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) return { kind: 'image', mime: 'image/gif' };
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return { kind: 'image', mime: 'image/webp' };
  if (ascii(4, 'ftyp')) {
    const brand = String.fromCharCode(at(8), at(9), at(10), at(11));
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return { kind: 'image', mime: 'image/heic' };
    }
    if (brand === 'avif' || brand === 'avis') return { kind: 'image', mime: 'image/avif' };
  }
  return null;
}

export type UploadProblem =
  | { readonly code: 'leer' }
  | { readonly code: 'unbekannt' }
  | { readonly code: 'zu-gross'; readonly limit: number; readonly size: number }
  | { readonly code: 'zu-viele-pixel'; readonly pixels: number }
  | { readonly code: 'speicher-voll' }
  | { readonly code: 'pdf-passwort' }
  | { readonly code: 'pdf-unlesbar' }
  | { readonly code: 'pdf-zu-viele-seiten'; readonly limit: number };

/** Prüft eine gewählte Datei; `wanted` schränkt die Art ein (Foto oder PDF). */
export function checkUpload(
  bytes: Uint8Array,
  wanted: MediaKind,
): { ok: true; kind: MediaKind; mime: string } | { ok: false; problem: UploadProblem } {
  if (bytes.byteLength === 0) return { ok: false, problem: { code: 'leer' } };
  const found = sniffMedia(bytes);
  if (!found || found.kind !== wanted) return { ok: false, problem: { code: 'unbekannt' } };
  const limit = found.kind === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_INPUT_BYTES;
  if (bytes.byteLength > limit) {
    return { ok: false, problem: { code: 'zu-gross', limit, size: bytes.byteLength } };
  }
  return { ok: true, ...found };
}

/** Größe einer Datei vor dem Lesen prüfen (spart das Einlesen einer riesigen Datei). */
export function checkSize(size: number, wanted: MediaKind): UploadProblem | null {
  if (size === 0) return { code: 'leer' };
  const limit = wanted === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_INPUT_BYTES;
  return size > limit ? { code: 'zu-gross', limit, size } : null;
}

export function checkPixels(width: number, height: number): UploadProblem | null {
  const pixels = width * height;
  return pixels > IMAGE_MAX_INPUT_PIXELS ? { code: 'zu-viele-pixel', pixels } : null;
}

/** Zielgröße mit längster Kante höchstens `maxEdge`, Seitenverhältnis bleibt. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** Meldung zu einem Problem beim Wählen einer Datei (Artboard `MedienFehler`). */
export function problemText(
  problem: UploadProblem,
  wanted: MediaKind,
  format: (bytes: number) => string,
): { title: string; text: string } {
  const what = wanted === 'pdf' ? 'PDF' : 'Bild';
  switch (problem.code) {
    case 'leer':
      return {
        title: `${what} ist leer`,
        text: 'Die Datei enthält keine Daten. Wähle eine andere.',
      };
    case 'unbekannt':
      return {
        title: `${what} nicht lesbar`,
        text:
          wanted === 'pdf'
            ? 'Das ist kein PDF oder die Datei ist beschädigt. Wähle eine andere Datei.'
            : 'Dieses Format kann Juri nicht öffnen. Nimm ein Foto oder ein JPEG- oder PNG-Bild.',
      };
    case 'zu-gross':
      return {
        title: `${what} ist zu groß`,
        text: `Die Datei hat ${format(problem.size)}, erlaubt sind ${format(problem.limit)}.${
          wanted === 'pdf' ? ' Teile das PDF in kleinere Teile oder verkleinere es.' : ''
        }`,
      };
    case 'zu-viele-pixel':
      return {
        title: 'Bild ist zu groß',
        text: 'Das Bild hat zu viele Bildpunkte für dieses Gerät. Verkleinere es vorher.',
      };
    case 'speicher-voll':
      return {
        title: 'Speicher voll',
        text: `Auf diesem Gerät ist nicht genug Platz für ${wanted === 'pdf' ? 'das PDF' : 'das Bild'}. Lösche Karten oder andere Dateien und versuche es noch einmal.`,
      };
    case 'pdf-passwort':
      return {
        title: 'PDF ist geschützt',
        text: 'Das PDF ist mit einem Passwort geschützt. Speichere eine Kopie ohne Passwort und wähle sie erneut.',
      };
    case 'pdf-unlesbar':
      return {
        title: 'PDF nicht lesbar',
        text: 'Das PDF ist beschädigt oder hat einen Aufbau, den Juri nicht öffnen kann. Wähle eine andere Datei.',
      };
    case 'pdf-zu-viele-seiten':
      return {
        title: 'PDF ist zu lang',
        text: `Juri öffnet PDFs bis ${problem.limit.toLocaleString('de-DE')} Seiten. Teile das PDF in kleinere Teile.`,
      };
  }
}

/**
 * Reicht der Speicher? `usage` und `quota` kommen aus `navigator.storage.estimate()`; fehlen sie,
 * gilt der Speicher als ausreichend (der Browser meldet dann beim Schreiben selbst). Die Reserve
 * deckt Kopien beim Speichern und Backup ab.
 */
export function hasRoom(
  needed: number,
  estimate: { usage?: number | undefined; quota?: number | undefined },
): boolean {
  if (estimate.quota === undefined || estimate.usage === undefined) return true;
  return estimate.quota - estimate.usage >= needed * 2 + 5_000_000;
}
