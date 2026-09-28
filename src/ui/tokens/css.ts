import type { Tokens } from './tokens.ts';

/**
 * Erzeugt den Inhalt von tokens.css aus den Tokens. Reine Funktion, damit sie im
 * Vite-Plugin und im Test identisch läuft.
 */
export function tokensToCss(t: Tokens): string {
  const lines: string[] = [];
  const add = (name: string, value: string) => lines.push(`  --${name}: ${value};`);

  for (const [name, value] of Object.entries(t.colors)) add(name, value);
  t.heatmap.forEach((value, level) => add(`heat-${level}`, value));
  for (const [key, r] of Object.entries(t.rating)) {
    add(`rating-${key}-bg`, r.bg);
    add(`rating-${key}-fg`, r.fg);
    add(`rating-${key}-border`, r.border);
  }
  for (const [name, value] of Object.entries(t.radii)) add(`radius-${name}`, value);
  for (const [name, value] of Object.entries(t.shadows)) add(`shadow-${name}`, value);
  for (const [name, value] of Object.entries(t.fonts)) add(`font-${name}`, value);
  for (const [name, s] of Object.entries(t.type)) {
    add(`type-${name}-size`, s.size);
    add(`type-${name}-line`, s.lineHeight);
    add(`type-${name}-tracking`, s.tracking);
    add(`type-${name}-weight`, s.weight);
  }
  for (const [name, value] of Object.entries(t.easing)) add(`ease-${name}`, value);
  for (const [name, value] of Object.entries(t.durations)) add(`dur-${name}`, value);
  add('touch-target', t.touchTarget);

  return [
    '/* Automatisch erzeugt aus src/ui/tokens/tokens.ts. Nicht von Hand bearbeiten. */',
    ':root {',
    ...lines,
    '}',
    '',
  ].join('\n');
}
