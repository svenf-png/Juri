import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

const paths = (list: RouteObject[]): string[] =>
  list.flatMap((r) => [...(r.path ? [r.path] : []), ...paths(r.children ?? [])]);

describe('routes', () => {
  it('bietet den Geräte-Check nur in der Testinstanz', () => {
    const Dummy = () => null;
    expect(paths(routes('app', Dummy))).not.toContain('/geraetecheck');
    expect(paths(routes('test', Dummy))).toContain('/geraetecheck');
    expect(paths(routes('app', Dummy))).toEqual([
      '/',
      '/einstellungen',
      '/willkommen',
      '/installieren',
      '/styleguide',
      '*',
    ]);
  });

  it('enthält den Geräte-Check im Build der echten App nicht', () => {
    expect(paths(routes('test'))).not.toContain('/geraetecheck');
  });
});
