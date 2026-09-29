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
      '/stapel/:deckId?',
      '/erfolge',
      '/teilen',
      '/fristen',
      '/high-fives',
      '/einstellungen/lernrhythmus',
      '/einstellungen',
      '/neu',
      '/karte/:cardId',
      '/lernen',
      '/willkommen',
      '/installieren',
      '/styleguide',
      '/styleguide/heute',
      '/styleguide/heute-erledigt',
      '/styleguide/lernen/frage',
      '/styleguide/lernen/luecke',
      '/styleguide/schema/lernen',
      '/styleguide/schema/inhalt',
      '/styleguide/schema/editor',
      '/styleguide/schema/punkt',
      '/styleguide/schema/verknuepfen',
      '/styleguide/schema/verknuepfen-leer',
      '/styleguide/schema/neue-karte',
      '/styleguide/schema/editor-leer',
      '/styleguide/schema/loeschen',
      '/styleguide/lernrhythmus',
      '/styleguide/stapel/liste',
      '/styleguide/stapel/detail',
      '/styleguide/stapel/ipad',
      '/styleguide/erstellen',
      '*',
    ]);
  });

  it('enthält den Geräte-Check im Build der echten App nicht', () => {
    expect(paths(routes('test'))).not.toContain('/geraetecheck');
  });
});
