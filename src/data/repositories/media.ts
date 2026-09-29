import type { MediaRecord } from '@/domain/model/records';
import type { JuriDb } from '../db';

/** Medium lesen; `null`, wenn es fehlt. */
export async function readMedia(db: JuriDb, id: string): Promise<MediaRecord | null> {
  return (await db.media.get(id)) ?? null;
}

/** Ob eine Karte auf das Medium zeigt (Bild einer Abdeckung oder PDF einer Herkunft). */
export async function isMediaUsed(db: JuriDb, id: string): Promise<boolean> {
  const [cover, source] = await Promise.all([
    db.cards.where('mediaId').equals(id).count(),
    db.cards.where('source.mediaId').equals(id).count(),
  ]);
  return cover + source > 0;
}

/**
 * Löscht Medien, auf die keine Karte mehr zeigt. Läuft in der Transaktion des Löschens einer Karte
 * oder eines Stapels (Tabellen `cards` und `media` gehören dazu), damit nichts liegen bleibt.
 * Liefert die gelöschten Kennungen.
 */
export async function releaseMedia(db: JuriDb, ids: Iterable<string>): Promise<string[]> {
  const released: string[] = [];
  for (const id of new Set(ids)) {
    if (await isMediaUsed(db, id)) continue;
    await db.media.delete(id);
    released.push(id);
  }
  return released;
}

/** Größe aller Medien in Bytes und Anzahl, für die Speicheranzeige. */
export async function mediaTotals(db: JuriDb): Promise<{ count: number; bytes: number }> {
  let bytes = 0;
  let count = 0;
  await db.media.each((m) => {
    count += 1;
    bytes += m.size;
  });
  return { count, bytes };
}
