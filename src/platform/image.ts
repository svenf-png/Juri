/** Bild-Dekodierung und Neukodierung (B7: max. 2000 px Kante, JPEG/WebP). */

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  ms: number;
}

export async function decodeImage(file: Blob): Promise<DecodedImage> {
  const t0 = performance.now();
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height, ms: performance.now() - t0 };
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
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

export interface EncodedImage {
  requestedType: string;
  actualType: string;
  bytes: number;
  width: number;
  height: number;
}

/** Kodiert neu. `actualType` zeigt, ob der Browser das Format wirklich liefert. */
export async function encodeImage(
  bitmap: ImageBitmap,
  type: 'image/jpeg' | 'image/webp',
  quality: number,
  maxEdge: number,
): Promise<EncodedImage> {
  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfügbar');
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error('Kodieren fehlgeschlagen');
  return { requestedType: type, actualType: blob.type, bytes: blob.size, ...size };
}
