import { describe, expect, it } from 'vitest';
import { clozeNumbers, clozePlain, gapSub, hasGap, parseCloze } from './cloze';

describe('parseCloze', () => {
  it('zerlegt Text und Lücken in Reihenfolge', () => {
    expect(parseCloze('Wegnahme ist der {{c1::Bruch fremden}} Gewahrsams.')).toEqual([
      { kind: 'text', text: 'Wegnahme ist der ' },
      { kind: 'gap', n: 1, text: 'Bruch fremden' },
      { kind: 'text', text: ' Gewahrsams.' },
    ]);
  });

  it('kennt mehrere Lücken, auch direkt hintereinander und am Rand', () => {
    expect(parseCloze('{{c1::a}}{{c2::b}}')).toEqual([
      { kind: 'gap', n: 1, text: 'a' },
      { kind: 'gap', n: 2, text: 'b' },
    ]);
  });

  it.each([
    ['ohne Nummer', '{{::a}}'],
    ['Nummer 0', '{{c0::a}}'],
    ['dreistellig', '{{c100::a}}'],
    ['leere Lücke', '{{c1::}}'],
    ['nicht geschlossen', '{{c1::a'],
    ['einfache Klammern', '{c1::a}'],
  ])('lässt %s als Text stehen', (_, text) => {
    expect(parseCloze(text)).toEqual([{ kind: 'text', text }]);
    expect(hasGap(text)).toBe(false);
  });

  it('erlaubt Zeilenumbrüche in der Lücke', () => {
    expect(clozeNumbers('{{c2::a\nb}}')).toEqual([2]);
  });

  it('gibt für leeren Text nichts zurück', () => {
    expect(parseCloze('')).toEqual([]);
  });
});

describe('clozeNumbers und clozePlain', () => {
  const text = 'A {{c3::x}} B {{c1::y}} C {{c3::z}}';

  it('liefert Nummern einmalig und aufsteigend', () => {
    expect(clozeNumbers(text)).toEqual([1, 3]);
    expect(hasGap(text)).toBe(true);
  });

  it('deckt alle Lücken auf', () => {
    expect(clozePlain(text)).toBe('A x B y C z');
  });

  it('benennt die Abfrage einer Lücke', () => {
    expect(gapSub(3)).toBe('c3');
  });
});
