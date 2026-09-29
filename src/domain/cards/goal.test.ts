import { describe, expect, it } from 'vitest';
import { createGoal, savedToast } from './goal';

describe('createGoal', () => {
  it('zeigt Fortschritt zum Ziel und danach die Zahl der angelegten Karten', () => {
    expect(createGoal(3)).toEqual({
      pct: 60,
      text: '3 von 5 heute',
      reached: false,
      remaining: 'noch 2 bis zum Tagesziel',
    });
    expect(createGoal(0)).toEqual({
      pct: 0,
      text: '0 von 5 heute',
      reached: false,
      remaining: 'noch 5 bis zum Tagesziel',
    });
    expect(createGoal(5)).toEqual({
      pct: 100,
      text: '5 heute angelegt',
      reached: true,
      remaining: 'Tagesziel erreicht',
    });
    expect(createGoal(7)).toEqual({
      pct: 100,
      text: '7 heute angelegt',
      reached: true,
      remaining: 'Tagesziel erreicht',
    });
  });

  it('kommt mit Ziel 0 zurecht', () => {
    expect(createGoal(0, 0)).toEqual({
      pct: 100,
      text: '0 heute angelegt',
      reached: true,
      remaining: 'Tagesziel erreicht',
    });
  });
});

describe('savedToast', () => {
  it('meldet gespeicherte Karten und das erreichte Tagesziel', () => {
    expect(savedToast(3, 149)).toEqual({
      title: 'Karte gespeichert',
      sub: '3 heute angelegt · 149 insgesamt',
    });
    expect(savedToast(5, 1234)).toEqual({
      title: 'Tagesziel Anlegen erreicht',
      sub: '1.234 insgesamt angelegt',
    });
    expect(savedToast(6, 10)).toEqual({
      title: 'Karte gespeichert',
      sub: '6 heute angelegt · 10 insgesamt',
    });
  });
});
