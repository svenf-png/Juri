import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { shellShortcut } from '@/domain/device/shortcuts';
import { useKeys } from '../useKeys';
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
  const navigate = useNavigate();
  // Kürzel für Tastatur und Desktop: „n“ neue Karte, „/“ Suche im Stapel.
  useKeys((input) => {
    const action = shellShortcut(input);
    if (action === 'new-card') {
      void navigate('/neu');
      return true;
    }
    if (action === 'search') {
      const field = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
      if (field) field.focus();
      else void navigate('/stapel');
      return true;
    }
    return false;
  });
  const context: unknown = useOutletContext();
  // High fives sind eine Unterseite von Erfolge (HighFive.dc.html, Rücksprung „Erfolge“).
  const highFives = pathname === '/high-fives';
  const current = active ?? (highFives ? 'erfolge' : navKeyFor(pathname));
  const isPushed = pushed ?? (highFives || /^\/stapel\/[^/]+$/.test(pathname));
  return (
    <div className={styles.shell} data-pushed={isPushed || undefined}>
      <Sidebar active={current} />
      <div className={styles.content}>{children ?? <Outlet context={context} />}</div>
      <TabBar active={current} hidden={isPushed} />
    </div>
  );
}
