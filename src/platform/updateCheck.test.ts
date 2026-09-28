import { describe, expect, it, vi } from 'vitest';
import { startUpdateChecks, UPDATE_CHECK_MIN_GAP_MS, type VisibilitySource } from './updateCheck';

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
  startUpdateChecks({ update }, doc, () => time);
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
      { update },
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
