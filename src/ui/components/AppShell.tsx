import type { ReactNode } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router';
import { navKeyFor, type NavKey } from './navigation';
import styles from './AppShell.module.css';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

/**
 * Rahmen der Hauptbereiche: unter 768 px Tab-Bar unten, ab 768 px Sidebar links (A8). Ein Stapel-
 * Detail ist auf dem iPhone eine Unterseite ohne Tab-Bar (Stapel.dc.html), zurück geht es mit „Stapel“.
 * Beide stehen im DOM, CSS blendet je nach Breite eine aus; `display: none` nimmt sie auch
 * aus dem Bedienungshilfen-Baum. Ohne `children` rendert der Rahmen die Unterroute und reicht
 * den Kontext des Routen-Wächters (Profil) an sie weiter.
 */
export function AppShell({
  active,
  pushed,
  children,
}: {
  active?: NavKey;
  /** Unterseite, die auf dem iPhone ohne Tab-Bar erscheint (Stapel.dc.html); Standard: Stapel-Detail. */
  pushed?: boolean;
  children?: ReactNode;
}) {
  const { pathname } = useLocation();
  const context: unknown = useOutletContext();
  const current = active ?? navKeyFor(pathname);
  const isPushed = pushed ?? /^\/stapel\/[^/]+$/.test(pathname);
  return (
    <div className={styles.shell} data-pushed={isPushed || undefined}>
      <Sidebar active={current} />
      <div className={styles.content}>{children ?? <Outlet context={context} />}</div>
      <TabBar active={current} hidden={isPushed} />
    </div>
  );
}
