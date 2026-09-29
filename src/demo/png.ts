/**
 * Kleines PNG aus Farbflächen, ohne Browser: Das Demo-Bild der `.juri`-Datei entsteht so
 * deterministisch in Tests und in der Testinstanz. PNG = Signatur, IHDR, IDAT (zlib), IEND.
 */
import { zlibSync } from 'fflate';

export interface Block {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: readonly [number, number, number];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** PNG (8 Bit RGB) mit weißem Grund und den Farbflächen `blocks`. */
export function blocksPng(
  width: number,
  height: number,
  blocks: readonly Block[],
): Uint8Array<ArrayBuffer> {
  const stride = 1 + width * 3;
  const raw = new Uint8Array(stride * height).fill(255);
  for (let y = 0; y < height; y += 1) raw[y * stride] = 0;
  for (const b of blocks) {
    for (let y = b.y; y < Math.min(height, b.y + b.h); y += 1) {
      for (let x = b.x; x < Math.min(width, b.x + b.w); x += 1) {
        const at = y * stride + 1 + x * 3;
        raw[at] = b.color[0];
        raw[at + 1] = b.color[1];
        raw[at + 2] = b.color[2];
      }
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // Bittiefe
  header[9] = 2; // Farbtyp RGB
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlibSync(raw, { level: 6 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
