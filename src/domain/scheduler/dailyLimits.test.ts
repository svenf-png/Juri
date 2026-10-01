import { describe, expect, it } from 'vitest';
import { LEARN_GOAL_MAX } from '../progress/goals';
import { effectiveNewPerDay, minNewPerDay } from './dailyLimits';
import { clampNewPerDay, NEW_PER_DAY_MAX, stepNewPerDay } from './settings';

describe('Tageslimit und Tagesziel', () => {
  it('das Limit liegt nie unter dem Ziel', () => {
    expect(effectiveNewPerDay(20, 24)).toBe(24);
    expect(effectiveNewPerDay(30, 24)).toBe(30);
    expect(effectiveNewPerDay(0, 1)).toBe(1);
  });

  it('das Ziel kann nie höher sein als das größte Limit', () => {
    expect(LEARN_GOAL_MAX).toBe(NEW_PER_DAY_MAX);
    expect(effectiveNewPerDay(0, LEARN_GOAL_MAX)).toBe(NEW_PER_DAY_MAX);
    expect(minNewPerDay(500)).toBe(NEW_PER_DAY_MAX);
  });

  it('Schritte und Grenzen des Limits beachten das Ziel', () => {
    expect(clampNewPerDay(3, 24)).toBe(24);
    expect(stepNewPerDay(25, -1, 24)).toBe(24);
    expect(stepNewPerDay(24, -1, 24)).toBe(24);
    expect(stepNewPerDay(24, 1, 24)).toBe(29);
    expect(stepNewPerDay(98, 1, 24)).toBe(100);
  });
});
