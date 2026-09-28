import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Start } from '@/ui/screens/start/Start';

const Styleguide = lazy(() =>
  import('@/ui/screens/styleguide/Styleguide').then((m) => ({ default: m.Styleguide })),
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
    { path: '/', element: <Start /> },
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
