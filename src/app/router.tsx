import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Installieren } from '@/ui/screens/installieren/Installieren';
import { Onboarding } from '@/ui/screens/onboarding/Onboarding';
import { Start } from '@/ui/screens/start/Start';
import { ProfileScreen, RequireBrowserTab, RequireNoProfile, RequireProfile } from './gates';

const Styleguide = lazy(() =>
  import('@/ui/screens/styleguide/Styleguide').then((m) => ({ default: m.Styleguide })),
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
        { path: '/', element: <ProfileScreen screen={Start} /> },
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
