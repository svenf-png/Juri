import { describe, expect, it, vi } from 'vitest';
import { deepLinkTarget, notFoundRedirectScript, restoreDeepLink } from './deepLink';

describe('deepLinkTarget', () => {
  it('gibt null zurück, wenn kein Deep Link übergeben wurde', () => {
    expect(deepLinkTarget('', '', '/Juri/')).toBeNull();
    expect(deepLinkTarget('?x=1', '', '/Juri/')).toBeNull();
  });

  it('stellt Pfad, Query und Hash wieder her', () => {
    expect(deepLinkTarget('?p=styleguide', '', '/Juri/')).toBe('/Juri/styleguide');
    expect(deepLinkTarget('?p=stapel%2Fabc&q=tab%3D2', '#oben', '/Juri/')).toBe(
      '/Juri/stapel/abc?tab=2#oben',
    );
  });

  it('entfernt führende Schrägstriche, damit keine protokoll-relative Adresse entsteht', () => {
    expect(deepLinkTarget('?p=%2F%2Fboese.example', '', '/Juri/')).toBe('/Juri/boese.example');
  });

  it('weist Schemata und Backslashes ab', () => {
    expect(deepLinkTarget('?p=javascript%3Aalert(1)', '', '/Juri/')).toBe('/Juri/');
    expect(deepLinkTarget('?p=%5C%5Cboese', '', '/Juri/')).toBe('/Juri/');
  });
});

describe('restoreDeepLink', () => {
  it('ersetzt die Adresse nur bei einem Deep Link', () => {
    const replaceState = vi.fn();
    restoreDeepLink({ search: '', hash: '' }, { replaceState }, '/Juri/');
    expect(replaceState).not.toHaveBeenCalled();

    restoreDeepLink({ search: '?p=geraetecheck', hash: '' }, { replaceState }, '/Juri/test/');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/Juri/test/geraetecheck');
  });
});

describe('notFoundRedirectScript', () => {
  function run(pathname: string, search = '', hash = '') {
    const replace = vi.fn();
    const location = { pathname, search, hash, replace };
    // Das Skript wird isoliert mit einer eigenen window-Attrappe ausgeführt.
    const script = new Function('window', notFoundRedirectScript('/Juri/', '/Juri/test/')) as (
      w: unknown,
    ) => void;
    script({ location });
    return replace;
  }

  it('leitet Pfade der App auf die App um', () => {
    expect(run('/Juri/styleguide', '?a=1', '#x')).toHaveBeenCalledWith(
      '/Juri/?p=styleguide&q=a%3D1#x',
    );
  });

  it('leitet Pfade der Testinstanz auf die Testinstanz um', () => {
    expect(run('/Juri/test/geraetecheck')).toHaveBeenCalledWith('/Juri/test/?p=geraetecheck');
  });

  it('ignoriert fremde Pfade', () => {
    expect(run('/anderes/projekt')).not.toHaveBeenCalled();
  });
});
