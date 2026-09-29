/**
 * Inhalts-Hash einer Karte (ADR-014): Er hält fest, was Absender und Empfänger teilen. Nicht
 * kryptografisch (kein Schutz gegen gezielte Kollisionen), aber deterministisch, unabhängig von
 * Schlüsselreihenfolge und ohne Browser-API. 64 Bit aus zwei FNV-1a-Läufen mit verschiedenen Startwerten.
 */
import type { Card } from '../model/records';

/** Felder, die nicht zum Inhalt zählen: Herkunft und Zeitpunkte, Stapelzuordnung, Notiz (privat). */
const IGNORED = new Set(['id', 'deckId', 'createdAt', 'updatedAt', 'note', 'originHash']);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const hex = (n: number) => n.toString(16).padStart(8, '0');

/** 16 Hexziffern über den Inhalt; Tags zählen ohne Reihenfolge. */
export function contentHash(card: Card): string {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(card)) {
    if (!IGNORED.has(key)) fields[key] = value;
  }
  fields.tags = [...card.tags].sort();
  const text = canonical(fields);
  return hex(fnv(text, 0x811c9dc5)) + hex(fnv(text, 0x9747b28c));
}
