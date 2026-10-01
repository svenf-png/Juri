import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '@/ui/components/AppShell';
import { Heute } from '@/ui/screens/heute/Heute';
import { Lernen } from '@/ui/screens/lernen/Lernen';
import { Installieren } from '@/ui/screens/installieren/Installieren';
import { Onboarding } from '@/ui/screens/onboarding/Onboarding';
import type { HighFiveVariant } from '@/ui/screens/highfive/HighFiveVorschau';
import { Erstellen } from '@/ui/screens/erstellen/Erstellen';
import { KarteBearbeiten } from '@/ui/screens/erstellen/KarteBearbeiten';
import type { AbdeckungVariant } from '@/ui/screens/erstellen/AbdeckungVorschau';
import type { SchemaVariant } from '@/ui/screens/schema/SchemaVorschau';
import type { ErfolgeVariant } from '@/ui/screens/erfolge/ErfolgeVorschau';
import type { FristenVariant } from '@/ui/screens/fristen/FristenVorschau';
import type { TeilenVariant } from '@/ui/screens/teilen/TeilenVorschau';
import { Stapel } from '@/ui/screens/stapel/Stapel';
import { ProfileScreen, RequireBrowserTab, RequireNoProfile, RequireProfile } from './gates';

const Styleguide = lazy(() =>
  import('@/ui/screens/styleguide/Styleguide').then((m) => ({ default: m.Styleguide })),
);
const HeuteVorschau = lazy(() =>
  import('@/ui/screens/heute/HeuteVorschau').then((m) => ({ default: m.HeuteVorschau })),
);
const HeuteErledigtVorschau = lazy(() =>
  import('@/ui/screens/heute/HeuteVorschau').then((m) => ({ default: m.HeuteErledigtVorschau })),
);
const LernenVorschau = lazy(() =>
  import('@/ui/screens/lernen/LernenVorschau').then((m) => ({ default: m.LernenVorschau })),
);
const SCHEMA_VARIANTS: readonly SchemaVariant[] = [
  'lernen',
  'inhalt',
  'editor',
  'punkt',
  'verknuepfen',
  'verknuepfen-leer',
  'neue-karte',
  'editor-leer',
  'loeschen',
];
const SchemaVorschau = lazy(() =>
  import('@/ui/screens/schema/SchemaVorschau').then((m) => ({ default: m.SchemaVorschau })),
);
const FRISTEN_VARIANTS: readonly FristenVariant[] = [
  'liste',
  'leer',
  'endspurt',
  'neu',
  'bearbeiten',
  'fehler',
  'umfang',
  'loeschen',
];
const ERFOLGE_VARIANTS: readonly ErfolgeVariant[] = [
  'liste',
  'leer',
  'ziele',
  'fehler',
  'meilenstein',
  'fertig',
];
const ErfolgeVorschau = lazy(() =>
  import('@/ui/screens/erfolge/ErfolgeVorschau').then((m) => ({ default: m.ErfolgeVorschau })),
);
const Erfolge = lazy(() =>
  import('@/ui/screens/erfolge/Erfolge').then((m) => ({ default: m.Erfolge })),
);
const TEILEN_VARIANTS: readonly TeilenVariant[] = [
  'bereit',
  'import',
  'stapel',
  'konflikt',
  'fehler',
  'leer',
  'erfolg',
  'anleitung',
];
const TeilenVorschau = lazy(() =>
  import('@/ui/screens/teilen/TeilenVorschau').then((m) => ({ default: m.TeilenVorschau })),
);
const Teilen = lazy(() =>
  import('@/ui/screens/teilen/Teilen').then((m) => ({ default: m.Teilen })),
);
const HIGHFIVE_VARIANTS: readonly HighFiveVariant[] = [
  'liste',
  'ipad',
  'leer',
  'gegeben',
  'einfach',
  'feier',
  'karte',
  'kontakte',
  'kontakt',
  'gruss',
  'fehler',
];
const HighFiveVorschau = lazy(() =>
  import('@/ui/screens/highfive/HighFiveVorschau').then((m) => ({ default: m.HighFiveVorschau })),
);
const HighFive = lazy(() =>
  import('@/ui/screens/highfive/HighFive').then((m) => ({ default: m.HighFive })),
);
const FristenVorschau = lazy(() =>
  import('@/ui/screens/fristen/FristenVorschau').then((m) => ({ default: m.FristenVorschau })),
);
const Fristen = lazy(() =>
  import('@/ui/screens/fristen/Fristen').then((m) => ({ default: m.Fristen })),
);
const ABDECKUNG_VARIANTS: readonly AbdeckungVariant[] = [
  'lernen',
  'antwort',
  'leer',
  'quelle',
  'fehler',
  'verkleinern',
  'bild',
  'editor',
  'editor-leer',
  'pdf',
  'ipad',
  'ipad-abdecken',
];
const AbdeckungVorschau = lazy(() =>
  import('@/ui/screens/erstellen/AbdeckungVorschau').then((m) => ({
    default: m.AbdeckungVorschau,
  })),
);
const LernrhythmusVorschau = lazy(() =>
  import('@/ui/screens/einstellungen/LernrhythmusVorschau').then((m) => ({
    default: m.LernrhythmusVorschau,
  })),
);
const StapelVorschau = lazy(() =>
  import('@/ui/screens/stapel/StapelVorschau').then((m) => ({ default: m.StapelVorschau })),
);
const ErstellenVorschau = lazy(() =>
  import('@/ui/screens/stapel/StapelVorschau').then((m) => ({ default: m.ErstellenVorschau })),
);
const Lernrhythmus = lazy(() =>
  import('@/ui/screens/einstellungen/Lernrhythmus').then((m) => ({ default: m.Lernrhythmus })),
);
const Einstellungen = lazy(() =>
  import('@/ui/screens/einstellungen/Einstellungen').then((m) => ({ default: m.Einstellungen })),
);
// Nur in der Testinstanz; in der echten App entfernt der Build diesen Zweig samt Chunk.
const Geraetecheck =
  __JURI_INSTANCE__ === 'test'
    ? lazy(() =>
        import('@/ui/screens/geraetecheck/Geraetecheck').then((m) => ({ default: m.Geraetecheck })),
      )
    : null;

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/**
 * Routen je Instanz. `geraetecheck` ist austauschbar, damit Tests die Testinstanz-Routen
 * prüfen können, obwohl sie selbst als echte App gebaut werden.
 */
export function routes(
  instance: 'app' | 'test',
  geraetecheck: ComponentType | null = Geraetecheck,
): RouteObject[] {
  const Check = geraetecheck;
  const list: RouteObject[] = [
    {
      element: <RequireProfile />,
      children: [
        {
          // Hauptbereiche mit Tab-Bar (iPhone) bzw. Sidebar (iPad).
          element: <AppShell />,
          children: [
            { path: '/', element: <ProfileScreen screen={Heute} /> },
            { path: '/stapel/:deckId?', element: <Stapel /> },
            {
              path: '/erfolge',
              element: (
                <Lazy>
                  <Erfolge />
                </Lazy>
              ),
            },
            {
              path: '/teilen',
              element: (
                <Lazy>
                  <Teilen />
                </Lazy>
              ),
            },
            {
              path: '/fristen',
              element: (
                <Lazy>
                  <Fristen />
                </Lazy>
              ),
            },
            {
              path: '/high-fives',
              element: (
                <Lazy>
                  <HighFive />
                </Lazy>
              ),
            },
            {
              path: '/einstellungen/lernrhythmus',
              element: (
                <Lazy>
                  <Lernrhythmus />
                </Lazy>
              ),
            },
            {
              path: '/einstellungen',
              element: (
                <Lazy>
                  <ProfileScreen screen={Einstellungen} />
                </Lazy>
              ),
            },
          ],
        },
        // Abläufe im Vollbild, ohne Navigation.
        { path: '/neu', element: <Erstellen /> },
        { path: '/karte/:cardId', element: <KarteBearbeiten /> },
        { path: '/lernen', element: <Lernen /> },
      ],
    },
    {
      element: <RequireNoProfile />,
      children: [{ path: '/willkommen', element: <Onboarding /> }],
    },
    {
      element: <RequireBrowserTab />,
      children: [{ path: '/installieren', element: <Installieren /> }],
    },
    {
      path: '/styleguide',
      element: (
        <Lazy>
          <Styleguide />
        </Lazy>
      ),
    },
    {
      // Heute mit den Beispieldaten der Designs; ohne Datenbank, auch im Safari-Tab.
      path: '/styleguide/heute',
      element: (
        <Lazy>
          <HeuteVorschau />
        </Lazy>
      ),
    },
    {
      path: '/styleguide/heute-erledigt',
      element: (
        <Lazy>
          <HeuteErledigtVorschau />
        </Lazy>
      ),
    },
    // Lernen und Lernrhythmus mit den Beispieldaten der Designs (Bildvergleich, A12).
    ...(['frage', 'luecke'] as const).map((variant) => ({
      path: `/styleguide/lernen/${variant}`,
      element: (
        <Lazy>
          <LernenVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // Schema (Schema.dc.html, SchemaEditor.dc.html und die M5-Ergänzungen) mit Beispieldaten.
    ...SCHEMA_VARIANTS.map((variant) => ({
      path: `/styleguide/schema/${variant}`,
      element: (
        <Lazy>
          <SchemaVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // Abdeckung, PDF und Foto (Abdeckung.dc.html, iPadErstellen.dc.html und die M6-Ergänzungen).
    ...ABDECKUNG_VARIANTS.map((variant) => ({
      path: `/styleguide/abdeckung/${variant}`,
      element: (
        <Lazy>
          <AbdeckungVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // Erfolge (Erfolge.dc.html, iPadErfolge.dc.html, Fertig.dc.html und die M9-Ergänzungen).
    ...ERFOLGE_VARIANTS.map((variant) => ({
      path: `/styleguide/erfolge/${variant}`,
      element: (
        <Lazy>
          <ErfolgeVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // Teilen und Import (Teilen.dc.html und die M10-Artboards) mit Beispieldaten.
    ...TEILEN_VARIANTS.map((variant) => ({
      path: `/styleguide/teilen/${variant}`,
      element: (
        <Lazy>
          <TeilenVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // High fives (HighFive.dc.html und die M11-Artboards) mit Beispieldaten.
    ...HIGHFIVE_VARIANTS.map((variant) => ({
      path: `/styleguide/high-fives/${variant}`,
      element: (
        <Lazy>
          <HighFiveVorschau variant={variant} />
        </Lazy>
      ),
    })),
    // Fristen (Fristen.dc.html und die M8-Ergänzungen) mit Beispieldaten.
    ...FRISTEN_VARIANTS.map((variant) => ({
      path: `/styleguide/fristen/${variant}`,
      element: (
        <Lazy>
          <FristenVorschau variant={variant} />
        </Lazy>
      ),
    })),
    {
      path: '/styleguide/lernrhythmus',
      element: (
        <Lazy>
          <LernrhythmusVorschau />
        </Lazy>
      ),
    },
    // Stapel und Erstellen mit den Beispieldaten der Designs (Bildvergleich, A12).
    ...(['liste', 'detail', 'ipad'] as const).map((screen) => ({
      path: `/styleguide/stapel/${screen}`,
      element: (
        <Lazy>
          <StapelVorschau screen={screen} />
        </Lazy>
      ),
    })),
    {
      path: '/styleguide/erstellen',
      element: (
        <Lazy>
          <ErstellenVorschau />
        </Lazy>
      ),
    },
  ];
  if (instance === 'test' && Check) {
    list.push({
      path: '/geraetecheck',
      element: (
        <Lazy>
          <Check />
        </Lazy>
      ),
    });
  }
  list.push({ path: '*', element: <Navigate to="/" replace /> });
  return list;
}

export function createRouter() {
  return createBrowserRouter(routes(__JURI_INSTANCE__), {
    // Mit abschließendem Schrägstrich, damit die Startseite „/Juri/“ heißt und im
    // Bereich (scope) des Manifests bleibt; „/Juri“ läge für iOS außerhalb der App.
    basename: import.meta.env.BASE_URL,
  });
}
