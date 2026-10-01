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
      '/styleguide/abdeckung/lernen',
      '/styleguide/abdeckung/antwort',
      '/styleguide/abdeckung/leer',
      '/styleguide/abdeckung/quelle',
      '/styleguide/abdeckung/fehler',
      '/styleguide/abdeckung/verkleinern',
      '/styleguide/abdeckung/bild',
      '/styleguide/abdeckung/editor',
      '/styleguide/abdeckung/editor-leer',
      '/styleguide/abdeckung/pdf',
      '/styleguide/abdeckung/ipad',
      '/styleguide/abdeckung/ipad-abdecken',
      '/styleguide/erfolge/liste',
      '/styleguide/erfolge/leer',
      '/styleguide/erfolge/ziele',
      '/styleguide/erfolge/fehler',
      '/styleguide/erfolge/meilenstein',
      '/styleguide/erfolge/fertig',
      '/styleguide/teilen/bereit',
      '/styleguide/teilen/import',
      '/styleguide/teilen/stapel',
      '/styleguide/teilen/konflikt',
      '/styleguide/teilen/fehler',
      '/styleguide/teilen/leer',
      '/styleguide/teilen/erfolg',
      '/styleguide/teilen/anleitung',
      '/styleguide/high-fives/liste',
      '/styleguide/high-fives/ipad',
      '/styleguide/high-fives/leer',
      '/styleguide/high-fives/gegeben',
      '/styleguide/high-fives/einfach',
      '/styleguide/high-fives/feier',
      '/styleguide/high-fives/karte',
      '/styleguide/high-fives/kontakte',
      '/styleguide/high-fives/kontakt',
      '/styleguide/high-fives/gruss',
      '/styleguide/high-fives/fehler',
      '/styleguide/fristen/liste',
      '/styleguide/fristen/leer',
      '/styleguide/fristen/endspurt',
      '/styleguide/fristen/neu',
      '/styleguide/fristen/bearbeiten',
      '/styleguide/fristen/fehler',
      '/styleguide/fristen/umfang',
      '/styleguide/fristen/loeschen',
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
