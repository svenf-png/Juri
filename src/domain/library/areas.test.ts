import { describe, expect, it } from 'vitest';
import type { Deck } from '../model/records';
import { areaDeletion, checkArea, missingSuggestions, normalizeAreaCode, sortAreas } from './areas';
import { checkDeck, toggleArea } from './deckRules';

describe('sortAreas', () => {
  it('stellt ZR, SR, ÖR voran und ordnet eigene nach Anlegen', () => {
    const areas = [
      { id: 'c', code: 'AR', createdAt: 9 },
      { id: 'b', code: 'ÖR', createdAt: 5 },
      { id: 'a', code: 'HR', createdAt: 2 },
      { id: 'd', code: 'ZR', createdAt: 7 },
      { id: 'e', code: 'SR', createdAt: 8 },
      { id: 'f', code: 'XX', createdAt: 2 },
    ];
    expect(sortAreas(areas).map((a) => a.code)).toEqual(['ZR', 'SR', 'ÖR', 'HR', 'XX', 'AR']);
  });
});

describe('Kürzel und Name', () => {
  it('bereinigt das Kürzel', () => {
    expect(normalizeAreaCode(' zr ')).toBe('ZR');
    expect(normalizeAreaCode('ö r')).toBe('ÖR');
    expect(normalizeAreaCode('abcdef')).toBe('ABCDEF');
  });

  it('prüft Kürzel und Name', () => {
    expect(checkArea({ code: 'ar', name: '  Arbeits  recht ' }, [])).toEqual({
      ok: true,
      code: 'AR',
      name: 'Arbeits recht',
    });
    expect(checkArea({ code: 'A', name: '' }, [])).toEqual({
      ok: false,
      errors: { code: 'Zwei bis vier Zeichen, Buchstaben oder Ziffern.', name: 'Der Name fehlt.' },
    });
    expect(checkArea({ code: 'a-b', name: 'x' }, [])).toMatchObject({
      ok: false,
      errors: { code: expect.any(String) as string },
    });
  });

  it('lehnt doppelte Kürzel und Namen ab, ohne Groß- und Kleinschreibung', () => {
    const others = [{ code: 'ZR', name: 'Zivilrecht' }];
    expect(checkArea({ code: 'zr', name: 'Anderes' }, others)).toEqual({
      ok: false,
      errors: { code: 'Dieses Kürzel gibt es schon.' },
    });
    expect(checkArea({ code: 'ZV', name: 'zivilRECHT' }, others)).toEqual({
      ok: false,
      errors: { name: 'Dieses Rechtsgebiet gibt es schon.' },
    });
  });

  it('meldet zu lange Kürzel und Namen, statt sie zu kürzen', () => {
    expect(checkArea({ code: 'ARBEIT', name: 'x' }, [])).toEqual({
      ok: false,
      errors: { code: 'Zwei bis vier Zeichen, Buchstaben oder Ziffern.' },
    });
    expect(checkArea({ code: 'AR', name: 'x'.repeat(61) }, [])).toEqual({
      ok: false,
      errors: { name: 'Der Name ist zu lang (höchstens 60 Zeichen).' },
    });
  });

  it('schlägt nur fehlende Rechtsgebiete vor', () => {
    expect(missingSuggestions([{ code: 'SR' }]).map((s) => s.code)).toEqual(['ZR', 'ÖR']);
    expect(missingSuggestions([])).toHaveLength(3);
  });
});

describe('areaDeletion', () => {
  const deck = (id: string, areaIds: string[]): Deck => ({
    id,
    name: id,
    norm: '',
    areaIds,
    createdAt: 1,
    updatedAt: 1,
  });

  it('sperrt, solange Stapel nur in diesem Rechtsgebiet liegen', () => {
    const decks = [deck('a', ['zr']), deck('b', ['zr', 'oer']), deck('c', ['sr'])];
    const result = areaDeletion('zr', decks);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.blockedBy.map((d) => d.id)).toEqual(['a']);
  });

  it('erlaubt, wenn alle Stapel auch anderswo liegen oder es keine gibt', () => {
    const decks = [deck('b', ['zr', 'oer']), deck('c', ['sr'])];
    const result = areaDeletion('zr', decks);
    expect(result.ok).toBe(true);
    expect(result.ok && result.alsoElsewhere.map((d) => d.id)).toEqual(['b']);
    expect(areaDeletion('leer', decks)).toEqual({ ok: true, alsoElsewhere: [] });
  });
});

describe('checkDeck und toggleArea', () => {
  it('bereinigt und prüft', () => {
    expect(
      checkDeck({ name: '  Sachen  recht ', norm: ' §§ 929 ff.  BGB ', areaIds: ['zr', 'zr'] }, []),
    ).toEqual({
      ok: true,
      name: 'Sachen recht',
      norm: '§§ 929 ff. BGB',
      areaIds: ['zr'],
    });
    expect(checkDeck({ name: '', norm: '', areaIds: [] }, [])).toEqual({
      ok: false,
      errors: { name: 'Der Name fehlt.', areas: 'Wähle mindestens ein Rechtsgebiet.' },
    });
    expect(
      checkDeck({ name: 'deliktsrecht', norm: '', areaIds: ['zr'] }, [{ name: 'Deliktsrecht' }]),
    ).toEqual({
      ok: false,
      errors: { name: 'Diesen Stapel gibt es schon.' },
    });
  });

  it('meldet zu lange Namen und Normen, statt sie zu kürzen', () => {
    expect(checkDeck({ name: 'x'.repeat(81), norm: '', areaIds: ['zr'] }, [])).toEqual({
      ok: false,
      errors: { name: 'Der Name ist zu lang (höchstens 80 Zeichen).' },
    });
    expect(checkDeck({ name: 'x', norm: 'n'.repeat(201), areaIds: ['zr'] }, [])).toEqual({
      ok: false,
      errors: { norm: 'Die Normen sind zu lang (höchstens 200 Zeichen).' },
    });
  });

  it('schaltet Rechtsgebiete um, das letzte bleibt', () => {
    expect(toggleArea(['zr'], 'oer')).toEqual(['zr', 'oer']);
    expect(toggleArea(['zr', 'oer'], 'zr')).toEqual(['oer']);
    expect(toggleArea(['zr'], 'zr')).toBeNull();
  });
});
