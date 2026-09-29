import { describe, expect, it } from 'vitest';
import {
  applySelection,
  pageLabel,
  parsePage,
  prefetchPages,
  renderPlan,
  tidySelection,
} from './pdfPlan';

describe('renderPlan', () => {
  it('rendert mit voller Pixeldichte, solange die Fläche reicht', () => {
    const plan = renderPlan(595, 842, 595, 2);
    expect(plan).toMatchObject({
      cssScale: 1,
      scale: 2,
      canvasWidth: 1190,
      canvasHeight: 1684,
      limited: false,
    });
  });

  it('senkt die Dichte, wenn die Fläche die Grenze übersteigt, und behält die Seitenform', () => {
    const plan = renderPlan(595, 842, 1500, 3, 12_000_000);
    expect(plan.limited).toBe(true);
    expect(plan.canvasWidth * plan.canvasHeight).toBeLessThanOrEqual(12_000_000);
    expect(plan.canvasWidth / plan.canvasHeight).toBeCloseTo(595 / 842, 2);
    expect(plan.cssScale).toBeCloseTo(1500 / 595, 6);
  });

  it('rechnet mit mindestens Dichte 1', () => {
    expect(renderPlan(100, 100, 200, 0.5).scale).toBe(2);
  });
});

describe('Seiten', () => {
  it('bereitet die nächste und die vorige Seite vor', () => {
    expect(prefetchPages(5, 10)).toEqual([6, 4]);
    expect(prefetchPages(1, 10)).toEqual([2]);
    expect(prefetchPages(10, 10)).toEqual([9]);
    expect(prefetchPages(1, 1)).toEqual([]);
  });

  it('liest Seitenzahlen aus Eingaben', () => {
    expect(parsePage(' 14 ', 62)).toBe(14);
    expect(parsePage('99', 62)).toBe(62);
    expect(parsePage('0', 62)).toBeNull();
    expect(parsePage('abc', 62)).toBeNull();
    expect(parsePage('-3', 62)).toBeNull();
    expect(parsePage('', 62)).toBeNull();
  });

  it('beschriftet die Seite', () => {
    expect(pageLabel(14, 62)).toBe('S. 14 / 62');
  });
});

describe('tidySelection', () => {
  it('entfernt Trennstriche am Zeilenende und faltet Zeilenumbrüche', () => {
    expect(tidySelection('grober Fahr-\nlässigkeit unbekannt')).toBe(
      'grober Fahrlässigkeit unbekannt',
    );
    expect(tidySelection('Der Erwerber\nist nicht   in gutem\nGlauben')).toBe(
      'Der Erwerber ist nicht in gutem Glauben',
    );
  });

  it('erhält Bindestriche vor Großbuchstaben und im Wort', () => {
    expect(tidySelection('§ 932-\nBGB')).toBe('§ 932- BGB');
    expect(tidySelection('BGB-Allgemeiner Teil')).toBe('BGB-Allgemeiner Teil');
  });

  it('entfernt weiche Trennstriche', () => {
    expect(tidySelection('Fahr­lässigkeit')).toBe('Fahrlässigkeit');
  });
});

describe('applySelection', () => {
  it('setzt Frage und Antwort und wechselt in den Frage-Reiter', () => {
    expect(applySelection('front', ' Wann?\n', { text: '' })).toEqual({
      front: 'Wann?',
      tab: 'qa',
    });
    expect(applySelection('back', 'Wenn bekannt.', { text: '' })).toEqual({
      back: 'Wenn bekannt.',
      tab: 'qa',
    });
  });

  it('setzt oder hängt den Lückentext an', () => {
    expect(applySelection('cloze', 'Ein Satz.', { text: '' })).toEqual({
      text: 'Ein Satz.',
      tab: 'cloze',
    });
    expect(applySelection('cloze', 'Zwei.', { text: 'Ein Satz.' })).toEqual({
      text: 'Ein Satz. Zwei.',
      tab: 'cloze',
    });
  });
});
