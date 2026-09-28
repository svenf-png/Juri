import { describe, expect, it } from 'vitest';
import { TEST_MODE, instanceById, instanceForMode, navigateFallbackDenylist } from './instance';

describe('Instanzen', () => {
  it('baut standardmäßig die echte App', () => {
    for (const mode of ['production', 'development', 'test']) {
      expect(instanceForMode(mode).id).toBe('app');
    }
  });

  it('baut die Testinstanz nur im eigenen Modus', () => {
    const test = instanceForMode(TEST_MODE);
    expect(test.id).toBe('test');
    expect(test.base).toBe('/Juri/test/');
    expect(test.outDir).toBe('dist/test');
  });

  it('trennt Datenbank, Cache und Icons der Instanzen', () => {
    const app = instanceById('app');
    const test = instanceById('test');
    expect(app.dbName).not.toBe(test.dbName);
    expect(app.cacheId).not.toBe(test.cacheId);
    expect(app.iconPrefix).not.toBe(test.iconPrefix);
    expect(test.base.startsWith(app.base)).toBe(true);
  });

  it('lässt den Service Worker der App die Testinstanz nicht beantworten', () => {
    const [rule] = navigateFallbackDenylist(instanceById('app'));
    expect(rule?.test('/Juri/test/')).toBe(true);
    expect(rule?.test('/Juri/test/geraetecheck')).toBe(true);
    expect(rule?.test('/Juri/styleguide')).toBe(false);
    expect(navigateFallbackDenylist(instanceById('test'))).toEqual([]);
  });
});
