import { withoutArea } from '@/domain/deadlines/scope';
import { areaDeletion } from '@/domain/library/areas';
import type { Area, Deck } from '@/domain/model/records';
import type { JuriDb } from '../db';

export async function readAreas(db: JuriDb): Promise<Area[]> {
  return db.areas.toArray();
}

export async function createArea(
  db: JuriDb,
  input: { id: string; code: string; name: string },
  now: number,
): Promise<Area> {
  const area: Area = { ...input, createdAt: now, updatedAt: now };
  await db.areas.add(area);
  return area;
}

export async function updateArea(
  db: JuriDb,
  id: string,
  input: { code: string; name: string },
  now: number,
): Promise<Area | null> {
  return db.transaction('rw', db.areas, async () => {
    const current = await db.areas.get(id);
    if (!current) return null;
    const area: Area = { ...current, ...input, updatedAt: now };
    await db.areas.put(area);
    return area;
  });
}

/**
 * Löscht ein Rechtsgebiet. Liegen Stapel nur dort, ändert sich nichts und die Stapel werden
 * genannt (domain/library/areas.ts); die übrigen Stapel verlieren nur die Zuordnung.
 */
export async function deleteArea(
  db: JuriDb,
  id: string,
  now: number,
): Promise<{ ok: true } | { ok: false; blockedBy: Deck[] }> {
  return db.transaction('rw', db.areas, db.decks, db.deadlines, async () => {
    const inArea = await db.decks.where('areaIds').equals(id).toArray();
    const rule = areaDeletion(id, inArea);
    if (!rule.ok) return rule;
    await db.decks.bulkPut(
      inArea.map((d) => ({ ...d, areaIds: d.areaIds.filter((a) => a !== id), updatedAt: now })),
    );
    await db.areas.delete(id);
    // Fristen verlieren das Rechtsgebiet aus ihrem Umfang (ADR-012).
    await db.deadlines.bulkPut(withoutArea(await db.deadlines.toArray(), id, now));
    return { ok: true } as const;
  });
}
