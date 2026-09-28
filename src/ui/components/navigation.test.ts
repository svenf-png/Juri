import { describe, expect, it } from 'vitest';
import { NAV, navKeyFor, SIDEBAR, TAB_BAR } from './navigation';

describe('navKeyFor', () => {
  it.each([
    ['/', 'heute'],
    ['/stapel', 'stapel'],
    ['/erfolge', 'erfolge'],
    ['/fristen', 'fristen'],
    ['/teilen', 'teilen'],
    ['/einstellungen', 'rhythmus'],
    ['/stapel/zr-1', 'stapel'],
    ['/lernen', null],
    ['/styleguide/heute', null],
  ])('%s → %s', (path, key) => {
    expect(navKeyFor(path)).toBe(key);
  });
});

describe('Navigation', () => {
  it('folgt der Reihenfolge der Designs', () => {
    expect(TAB_BAR.map((k) => NAV[k].label)).toEqual(['Heute', 'Stapel', 'Erfolge', 'Teilen']);
    expect(SIDEBAR.map((k) => NAV[k].label)).toEqual([
      'Heute',
      'Stapel',
      'Erfolge',
      'Fristen',
      'Teilen',
      'Lernrhythmus',
    ]);
  });
});
