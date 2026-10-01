import { describe, expect, it } from 'vitest';
import {
  deadlinesShortcut,
  formShortcut,
  pdfShortcut,
  highFiveShortcut,
  modifierLabel,
  shareShortcut,
  shellShortcut,
  type KeyInput,
} from './shortcuts';

const key = (k: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  editable: false,
  ...extra,
});

describe('formShortcut', () => {
  it('Strg+Enter und Cmd+Enter speichern, auch im Textfeld', () => {
    expect(formShortcut(key('Enter', { ctrlKey: true, editable: true }))).toBe('save');
    expect(formShortcut(key('Enter', { metaKey: true }))).toBe('save');
  });

  it('Enter allein und andere Tasten tun nichts', () => {
    expect(formShortcut(key('Enter'))).toBeNull();
    expect(formShortcut(key('s', { ctrlKey: true }))).toBeNull();
    expect(formShortcut(key('Enter', { ctrlKey: true, altKey: true }))).toBeNull();
  });
});

describe('deadlinesShortcut', () => {
  it('„f“ legt eine Frist an, nie beim Tippen oder mit Modifikatoren', () => {
    expect(deadlinesShortcut(key('f'))).toBe('new-deadline');
    expect(deadlinesShortcut(key('f', { editable: true }))).toBeNull();
    expect(deadlinesShortcut(key('f', { ctrlKey: true }))).toBeNull();
    expect(deadlinesShortcut(key('f', { metaKey: true }))).toBeNull();
    expect(deadlinesShortcut(key('f', { altKey: true }))).toBeNull();
    expect(deadlinesShortcut(key('n'))).toBeNull();
  });
});

describe('shellShortcut', () => {
  it('„n“ legt eine Karte an, „/“ sucht', () => {
    expect(shellShortcut(key('n'))).toBe('new-card');
    expect(shellShortcut(key('/'))).toBe('search');
  });

  it('bleibt beim Tippen und mit Modifikatoren stumm', () => {
    expect(shellShortcut(key('n', { editable: true }))).toBeNull();
    expect(shellShortcut(key('/', { editable: true }))).toBeNull();
    expect(shellShortcut(key('n', { ctrlKey: true }))).toBeNull();
    expect(shellShortcut(key('n', { metaKey: true }))).toBeNull();
    expect(shellShortcut(key('n', { altKey: true }))).toBeNull();
    expect(shellShortcut(key('x'))).toBeNull();
  });
});

describe('pdfShortcut', () => {
  it.each([
    ['PageUp', 'previous'],
    ['ArrowLeft', 'previous'],
    ['PageDown', 'next'],
    ['ArrowRight', 'next'],
    ['Home', 'first'],
    ['End', 'last'],
    ['+', 'zoom-in'],
    ['=', 'zoom-in'],
    ['-', 'zoom-out'],
    ['_', 'zoom-out'],
    ['0', 'zoom-reset'],
  ])('%s → %s', (k, action) => {
    expect(pdfShortcut(key(k))).toBe(action);
  });

  it('lässt Seitenzoom des Browsers und Eingabefelder in Ruhe', () => {
    expect(pdfShortcut(key('+', { ctrlKey: true }))).toBeNull();
    expect(pdfShortcut(key('0', { metaKey: true }))).toBeNull();
    expect(pdfShortcut(key('ArrowLeft', { altKey: true }))).toBeNull();
    expect(pdfShortcut(key('0', { editable: true }))).toBeNull();
    expect(pdfShortcut(key('a'))).toBeNull();
  });
});

describe('shareShortcut', () => {
  it('„i“ öffnet eine Datei, „e“ teilt', () => {
    expect(shareShortcut(key('i'))).toBe('open-file');
    expect(shareShortcut(key('e'))).toBe('send');
  });

  it('schweigt beim Tippen und mit Strg, Cmd oder Alt', () => {
    expect(shareShortcut(key('i', { editable: true }))).toBeNull();
    expect(shareShortcut(key('e', { ctrlKey: true }))).toBeNull();
    expect(shareShortcut(key('e', { metaKey: true }))).toBeNull();
    expect(shareShortcut(key('i', { altKey: true }))).toBeNull();
    expect(shareShortcut(key('x'))).toBeNull();
  });
});

describe('highFiveShortcut', () => {
  it('„h“, „o“ und „k“', () => {
    expect(highFiveShortcut(key('h'))).toBe('just-because');
    expect(highFiveShortcut(key('o'))).toBe('open-file');
    expect(highFiveShortcut(key('k'))).toBe('contacts');
  });

  it('schweigt beim Tippen und mit Strg, Cmd oder Alt', () => {
    expect(highFiveShortcut(key('h', { editable: true }))).toBeNull();
    expect(highFiveShortcut(key('o', { ctrlKey: true }))).toBeNull();
    expect(highFiveShortcut(key('k', { metaKey: true }))).toBeNull();
    expect(highFiveShortcut(key('h', { altKey: true }))).toBeNull();
    expect(highFiveShortcut(key('x'))).toBeNull();
  });
});

describe('modifierLabel', () => {
  it('Cmd auf dem Mac, sonst Strg', () => {
    expect(modifierLabel('Mac')).toBe('⌘');
    for (const platform of ['iPhone', 'iPad', 'Android', 'Andere'] as const) {
      expect(modifierLabel(platform)).toBe('Strg');
    }
  });
});
