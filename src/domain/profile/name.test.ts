import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH, initialOf, normalizeName } from './name';

describe('normalizeName', () => {
  it('entfernt Leerraum am Rand und fasst innen zusammen', () => {
    expect(normalizeName('  Anna \n  Maria\t')).toBe('Anna Maria');
  });

  it('vereinheitlicht Umlaute (NFC)', () => {
    expect(normalizeName('Jürgen')).toBe('Jürgen');
  });

  it('kürzt auf 40 Zeichen und zählt Emoji als ein Zeichen', () => {
    expect(normalizeName('x'.repeat(50))).toHaveLength(NAME_MAX_LENGTH);
    const judge = '👩‍⚖️';
    expect(normalizeName(judge.repeat(45))).toBe(judge.repeat(40));
  });

  it('entfernt Leerzeichen, die nach dem Kürzen am Ende stehen', () => {
    expect(normalizeName(`${'a'.repeat(39)} b`)).toBe('a'.repeat(39));
  });
});

describe('initialOf', () => {
  it.each([
    ['sven', 'S'],
    ['  ülrike', 'Ü'],
    ['👩‍⚖️ Anna', '👩‍⚖️'],
    ['   ', '?'],
  ])('%s → %s', (name, initial) => {
    expect(initialOf(name)).toBe(initial);
  });
});
