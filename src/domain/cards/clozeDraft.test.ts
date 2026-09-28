import { describe, expect, it } from 'vitest';
import {
  addGap,
  draftFromMarkup,
  draftSegments,
  draftToMarkup,
  editText,
  EMPTY_DRAFT,
  nextGapNumber,
  removeGap,
  type ClozeDraft,
} from './clozeDraft';

const TEXT = 'Wegnahme ist der Bruch fremden und die Begründung neuen Gewahrsams.';

function draftWith(text: string, ...words: string[]): ClozeDraft {
  let draft: ClozeDraft = { text, gaps: [] };
  for (const word of words) {
    const start = text.indexOf(word);
    const result = addGap(draft, start, start + word.length);
    if ('error' in result) throw new Error(result.error);
    draft = result.draft;
  }
  return draft;
}

describe('Umwandlung Markierung und Bearbeitungsmodell', () => {
  it('rechnet in beide Richtungen ohne Verlust', () => {
    const markup = 'A {{c2::bb}} C {{c1::dd}} E';
    const draft = draftFromMarkup(markup);
    expect(draft.text).toBe('A bb C dd E');
    expect(draft.gaps).toEqual([
      { n: 2, start: 2, end: 4 },
      { n: 1, start: 7, end: 9 },
    ]);
    expect(draftToMarkup(draft)).toBe(markup);
  });

  it('kennt Text ohne Lücken und leeren Text', () => {
    expect(draftToMarkup(draftFromMarkup('nur Text'))).toBe('nur Text');
    expect(draftToMarkup(EMPTY_DRAFT)).toBe('');
  });
});

describe('addGap', () => {
  it('setzt die Lücke und zählt hoch, auch bei rückwärts gezogener Auswahl', () => {
    const one = draftWith(TEXT, 'Bruch fremden');
    expect(one.gaps).toEqual([{ n: 1, start: 17, end: 30 }]);
    const two = addGap(one, 60, 52);
    expect(two).toEqual({
      draft: {
        text: TEXT,
        gaps: [
          { n: 1, start: 17, end: 30 },
          { n: 2, start: 52, end: 60 },
        ],
      },
    });
  });

  it('nimmt Leerraum am Rand der Auswahl nicht mit', () => {
    const result = addGap({ text: 'a  Wort  b', gaps: [] }, 1, 9);
    expect(result).toEqual({ draft: { text: 'a  Wort  b', gaps: [{ n: 1, start: 3, end: 7 }] } });
  });

  it('lehnt leere, überlappende und ungültige Auswahl ab', () => {
    expect(addGap(EMPTY_DRAFT, 0, 0)).toEqual({ error: 'leer' });
    expect(addGap({ text: '   ', gaps: [] }, 0, 3)).toEqual({ error: 'leer' });
    const one = draftWith(TEXT, 'Bruch fremden');
    expect(addGap(one, 20, 40)).toEqual({ error: 'ueberlappt' });
    expect(addGap({ text: 'a {{ b', gaps: [] }, 0, 6)).toEqual({ error: 'ungueltig' });
    expect(addGap({ text: 'a }} b', gaps: [] }, 0, 6)).toEqual({ error: 'ungueltig' });
  });

  it('begrenzt die Nummern auf 99', () => {
    const draft: ClozeDraft = { text: 'ab', gaps: [{ n: 99, start: 0, end: 1 }] };
    expect(addGap(draft, 1, 2)).toEqual({ error: 'zu-viele' });
  });

  it('klemmt die Auswahl auf den Text', () => {
    const result = addGap({ text: 'abc', gaps: [] }, -5, 99);
    expect(result).toEqual({ draft: { text: 'abc', gaps: [{ n: 1, start: 0, end: 3 }] } });
  });
});

describe('nextGapNumber und removeGap', () => {
  it('vergibt gelöschte Nummern nicht neu', () => {
    const draft = draftWith(TEXT, 'Bruch fremden', 'Begründung neuen', 'Gewahrsams');
    expect(nextGapNumber(draft)).toBe(4);
    const removed = removeGap(draft, 2);
    expect(removed.gaps.map((g) => g.n)).toEqual([1, 3]);
    expect(nextGapNumber(removed)).toBe(4);
    expect(nextGapNumber(EMPTY_DRAFT)).toBe(1);
  });

  it('entfernt alle Lücken einer Nummer', () => {
    const draft = draftFromMarkup('{{c1::a}} b {{c1::c}}');
    expect(removeGap(draft, 1).gaps).toEqual([]);
  });
});

describe('editText', () => {
  const draft = draftWith(TEXT, 'Bruch fremden', 'Gewahrsams');

  it('lässt Lücken unverändert, wenn sich nichts ändert', () => {
    expect(editText(draft, TEXT)).toBe(draft);
  });

  it('verschiebt Lücken hinter der Änderung und lässt die davor stehen', () => {
    const next = editText(draft, 'Die ' + TEXT);
    expect(draftToMarkup(next)).toBe(
      'Die Wegnahme ist der {{c1::Bruch fremden}} und die Begründung neuen {{c2::Gewahrsams}}.',
    );
    const shorter = editText(draft, TEXT.replace('Wegnahme ', ''));
    expect(draftToMarkup(shorter)).toBe(
      'ist der {{c1::Bruch fremden}} und die Begründung neuen {{c2::Gewahrsams}}.',
    );
  });

  it('verlängert eine Lücke beim Tippen darin, nicht an ihrem Rand', () => {
    const inside = editText(draft, TEXT.replace('Bruch fremden', 'Bruch des fremden'));
    expect(draftToMarkup(inside)).toContain('{{c1::Bruch des fremden}}');
    const before = editText(draft, TEXT.replace('der Bruch', 'der neue Bruch'));
    expect(draftToMarkup(before)).toContain('der neue {{c1::Bruch fremden}}');
    const after = editText(draft, TEXT.replace('fremden und', 'fremden, und'));
    expect(draftToMarkup(after)).toContain('{{c1::Bruch fremden}}, und');
  });

  it('behält die Lücke, wenn ihr Wort ersetzt wird', () => {
    const next = editText(draft, TEXT.replace('Bruch fremden', 'Vorgang'));
    expect(draftToMarkup(next)).toContain('{{c1::Vorgang}}');
  });

  it('verkürzt eine Lücke beim Löschen darin und entfernt sie, wenn nichts bleibt', () => {
    const shorter = editText(draft, TEXT.replace('Bruch fremden', 'Bruch'));
    expect(draftToMarkup(shorter)).toContain('{{c1::Bruch}}');
    const gone = editText(draft, TEXT.replace('Bruch fremden', ''));
    expect(gone.gaps.map((g) => g.n)).toEqual([2]);
  });

  it('verliert eine Lücke, die nur teilweise überschrieben wird', () => {
    const next = editText(draft, TEXT.replace('der Bruch fremden und', 'dem Ding und'));
    expect(next.gaps.map((g) => g.n)).toEqual([2]);
  });

  it('kommt mit leerem Text und Text ohne Lücken zurecht', () => {
    expect(editText(EMPTY_DRAFT, 'neu')).toEqual({ text: 'neu', gaps: [] });
    expect(editText(draft, '')).toEqual({ text: '', gaps: [] });
  });
});

describe('draftSegments', () => {
  it('teilt den Text an den Lücken', () => {
    const draft = draftWith('ab cd ef', 'cd');
    expect(draftSegments(draft)).toEqual([
      { text: 'ab ', gap: null },
      { text: 'cd', gap: 1 },
      { text: ' ef', gap: null },
    ]);
    expect(draftSegments(EMPTY_DRAFT)).toEqual([]);
  });
});
