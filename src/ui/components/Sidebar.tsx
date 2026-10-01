import { Link } from 'react-router';
import { cx } from '../cx';
import tap from '../motion/tap.module.css';
import { useSearchAction } from '../useSearchAction';
import { Kbd } from './Kbd';
import { PlusIcon, SearchIcon } from './icons';
import { NAV, NEW_CARD_PATH, SIDEBAR, type NavKey } from './navigation';
import styles from './Sidebar.module.css';

/**
 * Sidebar des iPads (iPadHeute.dc.html), ab 768 px Breite (A8). Ab 1280 px (Desktop-Gestaltung,
 * ADR-017) kommen „Suchen“ mit dem Kürzel „/“ und der Hinweis „N“ an „Neue Karte“ dazu.
 */
export function Sidebar({ active }: { active: NavKey | null }) {
  const search = useSearchAction();
  return (
    <aside className={styles.sidebar}>
      <span className={cx('display', styles.brand)} role="img" aria-label="Juri">
        <span aria-hidden="true">
          Jur
          <span className={styles.i}>
            ı<span className={styles.dot} />
          </span>
        </span>
      </span>
      <nav className={styles.nav} aria-label="Hauptnavigation">
        {SIDEBAR.map((key) => {
          const { to, label, Icon } = NAV[key];
          const current = key === active;
          return (
            <Link
              key={key}
              to={to}
              className={cx(styles.item, current && styles.active)}
              aria-current={current ? 'page' : undefined}
              data-addition={key === 'einstellungen' ? '' : undefined}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button type="button" className={styles.search} onClick={search} aria-keyshortcuts="/">
        <SearchIcon size={18} />
        <span className={styles.searchLabel}>Suchen</span>
        <Kbd>/</Kbd>
      </button>
      <Link to={NEW_CARD_PATH} className={cx(styles.create, tap.tap)} aria-keyshortcuts="N">
        <PlusIcon size={18} />
        <span className={styles.createLabel}>Neue Karte</span>
        <Kbd tone="dark">N</Kbd>
      </Link>
    </aside>
  );
}
