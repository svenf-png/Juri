import { describe, expect, it } from 'vitest';
import { cardPreview, PREVIEW_POINTS, type PreviewInput } from './preview';

const BASE: PreviewInput = { kind: 'qa', front: '', back: '', cloze: '', title: '', points: [] };

describe('Vorschau der Karte', () => {
  it('zeigt bei einer Frage Vorder- und Rückseite ohne Leerraum am Rand', () => {
    expect(
      cardPreview({ ...BASE, front: '  Was ist Gewahrsam? ', back: ' Sachherrschaft ' }),
    ).toEqual({
      typeLabel: 'Frage',
      front: 'Was ist Gewahrsam?',
      back: 'Sachherrschaft',
    });
  });

  it('bleibt bei leeren Eingaben leer', () => {
    expect(cardPreview(BASE)).toEqual({ typeLabel: 'Frage', front: '', back: '' });
  });

  it('ersetzt bei der Lücke jede Markierung durch […] und deckt sie hinten auf', () => {
    const preview = cardPreview({
      ...BASE,
      kind: 'cloze',
      cloze: 'Diebstahl ist die {{c1::Wegnahme}} einer {{c2::fremden beweglichen}} Sache.',
    });
    expect(preview.typeLabel).toBe('Lücke');
    expect(preview.front).toBe('Diebstahl ist die […] einer […] Sache.');
    expect(preview.back).toBe('Diebstahl ist die Wegnahme einer fremden beweglichen Sache.');
  });

  it('zeigt beim Schema den Titel vorn und die gezählten Punkte hinten', () => {
    const preview = cardPreview({
      ...BASE,
      kind: 'schema',
      title: ' Amtshaftung ',
      points: [
        { level: 1, text: 'Amt' },
        { level: 2, text: 'Pflicht' },
        { level: 1, text: 'Verschulden' },
      ],
    });
    expect(preview.typeLabel).toBe('Schema');
    expect(preview.front).toBe('Amtshaftung');
    expect(preview.back).toBe('1. Amt\n  a) Pflicht\n2. Verschulden');
  });

  it('kürzt lange Schemata mit einem Auslassungszeichen', () => {
    const points = Array.from({ length: PREVIEW_POINTS + 2 }, (_, i) => ({
      level: 1,
      text: `Punkt ${String(i + 1)}`,
    }));
    const lines = cardPreview({ ...BASE, kind: 'schema', points }).back.split('\n');
    expect(lines).toHaveLength(PREVIEW_POINTS + 1);
    expect(lines.at(-1)).toBe('…');
  });

  it('überlässt der Ansicht die Abdeckung', () => {
    expect(cardPreview({ ...BASE, kind: 'cover', front: 'x' })).toEqual({
      typeLabel: 'Abdeckung',
      front: '',
      back: '',
    });
  });
});
