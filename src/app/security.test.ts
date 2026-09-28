import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY, isEmbedded } from './security';

describe('CONTENT_SECURITY_POLICY', () => {
  it('erlaubt keine fremden Origins und keine Inline-Skripte', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });
});

describe('isEmbedded', () => {
  it('erkennt das oberste Fenster', () => {
    const win = {};
    expect(isEmbedded({ self: win, top: win })).toBe(false);
  });

  it('erkennt einen Frame', () => {
    expect(isEmbedded({ self: {}, top: {} })).toBe(true);
  });

  it('wertet einen Zugriffsfehler als eingebettet', () => {
    const win = {
      self: {},
      get top(): unknown {
        throw new Error('cross-origin');
      },
    };
    expect(isEmbedded(win)).toBe(true);
  });
});
