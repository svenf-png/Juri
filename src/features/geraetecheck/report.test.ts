import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS, buildReport } from './report';

describe('buildReport', () => {
  it('gliedert Ergebnisse und Fragen nach Abschnitten', () => {
    const text = buildReport({
      generatedAt: new Date('2026-09-28T16:00:00Z'),
      instance: 'test',
      build: '0.1.0 (abc1234)',
      results: {
        standalone: { label: 'Home-Bildschirm-App', value: 'ja', status: 'ok' },
        persisted: { label: 'Dauerhafter Speicher', value: 'nein', status: 'hinweis' },
      },
      resultSections: { standalone: 'umgebung', persisted: 'speicher' },
      answers: { 'statusleiste-farbe': 'ja' },
    });
    expect(text).toContain('Instanz: test · Build: 0.1.0 (abc1234)');
    expect(text).toContain('[Umgebung]\n- Home-Bildschirm-App: ja (OK)');
    expect(text).toContain('[Speicher]\n- Dauerhafter Speicher: nein (HINWEIS)');
    expect(text).toContain('Hat die Statusleiste die Lern-Fläche übernommen? → ja');
    expect(text).toContain('Waren .juri-Dateien mit Filter ausgegraut? → offen');
    expect(text.indexOf('[Umgebung]')).toBeLessThan(text.indexOf('[Speicher]'));
    expect(text).not.toContain('[Datenbank]');
  });
});

describe('Abschnitte und Fragen', () => {
  it('verweisen nur auf bekannte Abschnitte', () => {
    const ids = new Set(SECTIONS.map((s) => s.id));
    expect(QUESTIONS.every((q) => ids.has(q.section))).toBe(true);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
});
