import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '@/ui/components/AppShell';
import { Heute } from '@/ui/screens/heute/Heute';
import { Lernen } from '@/ui/screens/lernen/Lernen';
import { Installieren } from '@/ui/screens/installieren/Installieren';
import { Onboarding } from '@/ui/screens/onboarding/Onboarding';
import { Platzhalter } from '@/ui/screens/platzhalter/Platzhalter';
import { PLATZHALTER } from '@/ui/screens/platzhalter/texte';
import { Erstellen } from '@/ui/screens/erstellen/Erstellen';
import { KarteBearbeiten } from '@/ui/screens/erstellen/KarteBearbeiten';
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
            { path: '/erfolge', element: <Platzhalter {...PLATZHALTER.erfolge} /> },
            { path: '/teilen', element: <Platzhalter {...PLATZHALTER.teilen} /> },
            { path: '/fristen', element: <Platzhalter {...PLATZHALTER.fristen} /> },
            { path: '/high-fives', element: <Platzhalter {...PLATZHALTER.highFives} /> },
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
