import { describe, expect, it } from 'vitest';
import { formShortcut, pdfShortcut, shellShortcut, type KeyInput } from './shortcuts';

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
