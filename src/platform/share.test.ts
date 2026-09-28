import { describe, expect, it, vi } from 'vitest';
import { canShareFiles, classifyShareError, shareFiles } from './share';

const file = new File(['x'], 'Stapel.juri', { type: 'application/octet-stream' });

describe('canShareFiles', () => {
  it('ist false ohne canShare oder bei Fehler', () => {
    expect(canShareFiles({}, [file])).toBe(false);
    expect(
      canShareFiles(
        {
          canShare: () => {
            throw new Error('x');
          },
        },
        [file],
      ),
    ).toBe(false);
  });

  it('gibt die Antwort des Browsers weiter', () => {
    expect(canShareFiles({ canShare: () => true }, [file])).toBe(true);
  });
});

describe('shareFiles', () => {
  it('teilt nur mit dem files-Objekt', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareFiles({ share }, [file])).resolves.toBe('geteilt');
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });

  it('meldet fehlende API und Abbruch', async () => {
    await expect(shareFiles({}, [file])).resolves.toBe('nicht verfügbar');
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    await expect(shareFiles({ share }, [file])).resolves.toBe('abgebrochen');
  });
});

describe('classifyShareError', () => {
  it('ordnet Fehler zu', () => {
    expect(classifyShareError(new DOMException('x', 'NotAllowedError'))).toBe('nicht erlaubt');
    expect(classifyShareError(new Error('x'))).toBe('Fehler');
    expect(classifyShareError('x')).toBe('Fehler');
  });
});
