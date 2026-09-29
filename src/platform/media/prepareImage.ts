/**
 * Bild für eine Karte vorbereiten (M6, ADR-010): prüfen, mit Bordmitteln dekodieren (Safari 17
 * dekodiert HEIC nativ), auf höchstens 2000 px Kante verkleinern und als JPEG kodieren. Ein
 * durchsichtiger Hintergrund wird weiß, weil JPEG keine Transparenz kennt.
 */
import {
  checkPixels,
  checkSize,
  checkUpload,
  fitWithin,
  IMAGE_MAX_EDGE,
  IMAGE_QUALITY,
  type UploadProblem,
} from '@/domain/media/media';

export class MediaProblem extends Error {
  readonly problem: UploadProblem;

  constructor(problem: UploadProblem) {
    super(problem.code);
    this.name = 'MediaProblem';
    this.problem = problem;
  }
}

export interface PreparedImage {
  readonly data: ArrayBuffer;
  readonly mime: 'image/jpeg';
  readonly width: number;
  readonly height: number;
  readonly size: number;
  readonly originalSize: number;
  readonly originalWidth: number;
  readonly originalHeight: number;
  /** Das Bild wurde kleiner gerechnet. */
  readonly resized: boolean;
}

/** Dateiname ohne Endung als Anzeigename, z. B. „IMG_0042“. */
export function displayName(file: { name: string }, fallback: string): string {
  const name = file.name.replace(/\.[^.]{1,8}$/u, '').trim();
  return name === '' ? fallback : name.slice(0, 200);
}

async function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
  if (!blob) throw new MediaProblem({ code: 'unbekannt' });
  return blob;
}

/** Zeichnet eine Bitmap verkleinert weiß hinterlegt und kodiert sie als JPEG. */
export async function encodeJpeg(
  bitmap: ImageBitmap,
  maxEdge: number = IMAGE_MAX_EDGE,
): Promise<{ data: ArrayBuffer; width: number; height: number }> {
  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new MediaProblem({ code: 'unbekannt' });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await toBlob(canvas, 'image/jpeg', IMAGE_QUALITY);
    return { data: await blob.arrayBuffer(), ...size };
  } finally {
    // Zeichenflächen freigeben: iOS zählt sie gegen den Speicher der Seite.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Prüft und verkleinert eine gewählte Bilddatei; wirft `MediaProblem`. */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const early = checkSize(file.size, 'image');
  if (early) throw new MediaProblem(early);
  const original = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload(original, 'image');
  if (!checked.ok) throw new MediaProblem(checked.problem);
  let bitmap: ImageBitmap;
  try {
    const blob = new Blob([original], { type: checked.mime });
    try {
      // `from-image` richtet Fotos nach der Kameraausrichtung (EXIF) aus.
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      // Ältere Engines kennen den Wert nicht und werfen; dann gilt ihre eigene Voreinstellung.
      bitmap = await createImageBitmap(blob);
    }
  } catch {
    throw new MediaProblem({ code: 'unbekannt' });
  }
  try {
    const pixels = checkPixels(bitmap.width, bitmap.height);
    if (pixels) throw new MediaProblem(pixels);
    const out = await encodeJpeg(bitmap);
    return {
      data: out.data,
      mime: 'image/jpeg',
      width: out.width,
      height: out.height,
      size: out.data.byteLength,
      originalSize: original.byteLength,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      resized: out.width !== bitmap.width || out.height !== bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}
