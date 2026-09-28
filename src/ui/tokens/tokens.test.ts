// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tokensToCss } from './css';
import { colors, heatmap, rating, tokens } from './tokens';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('tokens.css', () => {
  it('ist mit tokens.ts im Gleichstand', () => {
    const file = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
    expect(file).toBe(tokensToCss(tokens));
  });

  it('enthält die Kernvariablen aus dem Briefing', () => {
    const css = tokensToCss(tokens);
    for (const name of ['ink', 'violet', 'violet-700', 'surface', 'line', 'muted', 'bg']) {
      expect(css).toContain(`--${name}: `);
    }
    expect(css).toContain('--ease-flip: cubic-bezier(.2,.85,.25,1.08);');
    expect(css).toContain('--dur-flip: 620ms;');
  });
});

describe('Farben aus dem Design', () => {
  it('übernimmt die Kernfarben exakt', () => {
    expect(colors.ink).toBe('#17141F');
    expect(colors.violet).toBe('#6A3FE0');
    expect(colors.muted).toBe('#6B6678');
    expect(heatmap).toEqual(['#F1EEF7', '#EEE8FD', '#C9B8F7', '#9A7BEF', '#6A3FE0']);
  });
});

describe('Kontrast (WCAG 4,5:1 für Text)', () => {
  const pairs: [string, string, string][] = [
    ['Text auf Weiß', colors.ink, colors.bg],
    ['Sekundärtext auf Weiß', colors.muted, colors.bg],
    ['Sekundärtext auf Fläche', colors.muted, colors.surface],
    ['Sekundärtext auf violet-100', colors.muted, colors['violet-100']],
    ['Placeholder auf Fläche', colors.placeholder, colors.surface],
    ['Link auf Weiß', colors.link, colors.bg],
    ['Veilchen-Text auf Fläche', colors.violet, colors.surface],
    ['violet-700 auf violet-100', colors['violet-700'], colors['violet-100']],
    ['Weiß auf Veilchen', colors.bg, colors.violet],
    ['Weiß auf Tinte', colors.bg, colors.ink],
  ];

  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(rating))('Bewertung %s', (_key, r) => {
    expect(contrast(r.fg, r.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
