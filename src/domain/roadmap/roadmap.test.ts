import { describe, expect, it } from 'vitest';
import { compareVersions, MILESTONES, roadmap } from './roadmap';

describe('compareVersions', () => {
  it('vergleicht numerisch, nicht als Text', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compareVersions('0.5.0', '0.5.0')).toBe(0);
    expect(compareVersions('0.4.1', '0.5.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '0.11.7')).toBeGreaterThan(0);
    expect(compareVersions('0.5.0-beta', '0.5.0')).toBe(0);
    expect(compareVersions('kaputt', '0.0.0')).toBe(0);
  });
});

describe('Meilensteine', () => {
  it('sind aufsteigend nach Version und lückenlos nummeriert', () => {
    MILESTONES.forEach((m, i) => {
      expect(m.id).toBe(`M${i}`);
      if (i > 0) expect(compareVersions(m.version, MILESTONES[i - 1]!.version)).toBeGreaterThan(0);
    });
  });
});

describe('roadmap', () => {
  it('Version 0.5.0: M0 bis M4 fertig, M5 in Arbeit, der Rest geplant', () => {
    const r = roadmap('0.5.0');
    expect(r.rows.map((x) => x.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'current',
      'planned',
      'planned',
      'planned',
      'planned',
      'planned',
      'planned',
      'planned',
      'planned',
    ]);
    expect(r).toMatchObject({
      done: 5,
      total: 14,
      summary: '5 von 14 Schritten fertig',
      percent: 36,
    });
  });

  it('Version 0.6.0: M0 bis M5 fertig, M6 in Arbeit', () => {
    const r = roadmap('0.6.0');
    expect(r.done).toBe(6);
    expect(r.rows[5]?.state).toBe('done');
    expect(r.rows[6]?.state).toBe('current');
    expect(r.summary).toBe('6 von 14 Schritten fertig');
  });

  it('Version 0.7.0: M0 bis M6 fertig, M7 (Browser-Version) in Arbeit', () => {
    const r = roadmap('0.7.0');
    expect(r.done).toBe(7);
    expect(r.rows[6]?.state).toBe('done');
    expect(r.rows[7]).toMatchObject({ id: 'M7', title: 'Browser-Version', state: 'current' });
    expect(r.summary).toBe('7 von 14 Schritten fertig');
  });

  it('eine Zwischenversion zählt noch zum vorigen Meilenstein', () => {
    expect(roadmap('0.4.1').done).toBe(4);
    expect(roadmap('0.4.1').rows[4]?.state).toBe('current');
  });

  it('Version 1.0.0: M12 fertig, nur M13 (Desktop-Gestaltung) in Arbeit', () => {
    const r = roadmap('1.0.0');
    expect(r.rows[12]?.state).toBe('done');
    expect(r.rows[13]?.state).toBe('current');
    expect(r.summary).toBe('13 von 14 Schritten fertig');
  });

  it('vor dem ersten Meilenstein ist M0 in Arbeit; ab 1.1.0 ist alles fertig', () => {
    expect(roadmap('0.0.1').rows[0]?.state).toBe('current');
    expect(roadmap('0.0.1').done).toBe(0);
    const full = roadmap('1.1.0');
    expect(full.summary).toBe('Alle Schritte fertig');
    expect(full.percent).toBe(100);
    expect(full.rows.every((x) => x.state === 'done')).toBe(true);
  });

  it('ohne Meilensteine ist nichts zu zeigen', () => {
    expect(roadmap('0.5.0', [])).toMatchObject({ done: 0, total: 0, percent: 0 });
  });
});
