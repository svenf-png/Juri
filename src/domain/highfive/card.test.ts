import { describe, expect, it } from 'vitest';
import { CARD_HEIGHT, CARD_WIDTH, cardPlan, cardSentence, wrapLines } from './card';

/** Feste Messung: 10 Pixel je Zeichen, damit der Umbruch deterministisch ist. */
const measure = (text: string) => text.length * 10;

describe('Bildkarte', () => {
  it('Satz je Fall', () => {
    expect(cardSentence({ from: 'Sven', to: 'Mara', win: '12 Tage in Folge' })).toBe(
      'Sven schickt Mara ein High five für 12 Tage in Folge.',
    );
    expect(cardSentence({ from: 'Sven', to: 'Mara' })).toBe(
      'Sven schickt Mara ein High five. Einfach so.',
    );
    expect(cardSentence({ from: 'Sven', win: 'x' })).toBe('Sven schickt dir ein High five für x.');
    expect(cardSentence({ from: 'Sven', to: '  ' })).toBe(
      'Sven schickt dir ein High five. Einfach so.',
    );
  });

  it('Umbruch nach Wörtern, lange Wörter werden getrennt, zu viele Zeilen enden mit Auslassung', () => {
    expect(wrapLines('aaa bbb ccc ddd', 80, 'f', measure)).toEqual(['aaa bbb', 'ccc ddd']);
    expect(wrapLines('x'.repeat(25), 100, 'f', measure)).toEqual([
      'x'.repeat(10),
      'x'.repeat(10),
      'xxxxx',
    ]);
    const long = wrapLines('eins zwei drei vier fünf sechs sieben acht', 40, 'f', measure, 2);
    expect(long).toHaveLength(2);
    expect(long[1]?.endsWith('…')).toBe(true);
    expect(wrapLines('', 100, 'f', measure)).toEqual([]);
  });

  it('der Plan ist deterministisch, enthält den Satz nur als Text und passt in die Karte', () => {
    const content = { from: 'Sven', to: 'Mara', win: '12 Tage in Folge' };
    const plan = cardPlan(content, measure);
    expect(cardPlan(content, measure)).toEqual(plan);
    expect([plan.width, plan.height]).toEqual([CARD_WIDTH, CARD_HEIGHT]);
    expect(plan.alt).toBe(cardSentence(content));
    const texts = plan.ops.filter((o) => o.kind === 'text').map((o) => o.text);
    expect(texts[0]).toBe('High five!');
    expect(texts.slice(1, -1).join(' ')).toBe(plan.alt);
    expect(texts.at(-1)).toBe('Juri');
    for (const op of plan.ops) {
      if (op.kind === 'text') expect(op.y).toBeLessThanOrEqual(CARD_HEIGHT);
    }
  });

  it('Markup im Namen bleibt Text', () => {
    const plan = cardPlan({ from: '<b>x</b>', win: '<img src=x>' }, measure);
    expect(plan.ops.some((o) => o.kind === 'text' && o.text.includes('<b>'))).toBe(true);
  });
});
