import type { ReactNode } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router';
import { navKeyFor, type NavKey } from './navigation';
import styles from './AppShell.module.css';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

/**
 * Rahmen der Hauptbereiche: unter 768 px Tab-Bar unten, ab 768 px Sidebar links (A8).
 * Beide stehen im DOM, CSS blendet je nach Breite eine aus; `display: none` nimmt sie auch
 * aus dem Bedienungshilfen-Baum. Ohne `children` rendert der Rahmen die Unterroute und reicht
 * den Kontext des Routen-Wächters (Profil) an sie weiter.
 */
export function AppShell({ active, children }: { active?: NavKey; children?: ReactNode }) {
  const { pathname } = useLocation();
  const context: unknown = useOutletContext();
  const current = active ?? navKeyFor(pathname);
  return (
    <div className={styles.shell}>
      <Sidebar active={current} />
      <div className={styles.content}>{children ?? <Outlet context={context} />}</div>
      <TabBar active={current} />
    </div>
  );
}
