import { describe, expect, it } from 'vitest';
import { prepareRestore } from '@/data/backup';
import { schemaVersion } from '@/data/migrations';
import { demoTables } from './demoProfile';

describe('Demo-Profil', () => {
  const now = new Date(2026, 8, 28, 12).getTime();

  it('ist deterministisch und gültig wie ein Backup', () => {
    expect(demoTables(now)).toEqual(demoTables(now));
    const tables = prepareRestore({
      schemaVersion: schemaVersion(),
      createdAt: now,
      app: { instance: 'test', version: '0' },
      tables: demoTables(now),
    });
    expect(tables.profile).toEqual([
      expect.objectContaining({ name: 'Demo', createdAt: now - 182 * 86_400_000 }),
    ]);
  });
});
