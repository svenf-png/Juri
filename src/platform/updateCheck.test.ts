import { describe, expect, it, vi } from 'vitest';
import {
  canUpdate,
  shouldPromptForUpdate,
  startUpdateChecks,
  UPDATE_CHECK_MIN_GAP_MS,
  type VisibilitySource,
} from './updateCheck';

function setup() {
  let listener: (() => void) | undefined;
  const doc: VisibilitySource & { visibilityState: string } = {
    visibilityState: 'visible',
    addEventListener: (_type, l) => {
      listener = l;
    },
  };
  const update = vi.fn(() => Promise.resolve());
  let time = 1_000_000;
  startUpdateChecks({ update, active: {} }, doc, () => time);
  return {
    update,
    doc,
    advance: (ms: number) => {
      time += ms;
    },
    fire: () => listener?.(),
  };
}

describe('startUpdateChecks', () => {
  it('fragt sofort beim Start nach', () => {
    expect(setup().update).toHaveBeenCalledTimes(1);
  });

  it('fragt beim Zurückkehren in den Vordergrund nach dem Mindestabstand erneut', () => {
    const s = setup();
    s.advance(UPDATE_CHECK_MIN_GAP_MS);
    s.fire();
    expect(s.update).toHaveBeenCalledTimes(2);
  });

  it('fragt nicht häufiger als der Mindestabstand', () => {
    const s = setup();
    s.advance(UPDATE_CHECK_MIN_GAP_MS - 1);
    s.fire();
    expect(s.update).toHaveBeenCalledTimes(1);
    s.advance(1);
    s.fire();
    s.fire();
    expect(s.update).toHaveBeenCalledTimes(2);
  });

  it('fragt nicht, wenn die App in den Hintergrund geht', () => {
    const s = setup();
    s.advance(UPDATE_CHECK_MIN_GAP_MS * 5);
    s.doc.visibilityState = 'hidden';
    s.fire();
    expect(s.update).toHaveBeenCalledTimes(1);
  });

  it('übersteht eine fehlgeschlagene Nachfrage (offline)', async () => {
    let listener: (() => void) | undefined;
    const update = vi.fn(() => Promise.reject(new Error('offline')));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    startUpdateChecks(
      { update, active: {} },
      {
        visibilityState: 'visible',
        addEventListener: (_t, l) => {
          listener = l;
        },
      },
      () => 0,
    );
    listener?.();
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe('erste Installation', () => {
  const doc: VisibilitySource = { visibilityState: 'visible', addEventListener: () => undefined };

  it('fragt nicht nach, solange noch kein Worker aktiv ist oder einer installiert wird', () => {
    const update = vi.fn(() => Promise.resolve());
    startUpdateChecks({ update, installing: {} }, doc, () => 0);
    startUpdateChecks({ update, installing: {}, active: {} }, doc, () => 0);
    startUpdateChecks({ update }, doc, () => 0);
    expect(update).not.toHaveBeenCalled();
  });

  it('canUpdate: nur mit aktivem Worker und ohne laufende Installation', () => {
    const update = () => Promise.resolve();
    expect(canUpdate({ update, active: {} })).toBe(true);
    expect(canUpdate({ update, active: {}, installing: {} })).toBe(false);
    expect(canUpdate({ update, installing: {} })).toBe(false);
    expect(canUpdate({ update })).toBe(false);
  });

  it('der Hinweis erscheint nur für eine gesteuerte Seite', () => {
    expect(shouldPromptForUpdate(true, true)).toBe(true);
    expect(shouldPromptForUpdate(true, false)).toBe(false);
    expect(shouldPromptForUpdate(false, true)).toBe(false);
  });
});
