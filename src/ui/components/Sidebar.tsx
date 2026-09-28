import { Link } from 'react-router';
import { cx } from '../cx';
import tap from '../motion/tap.module.css';
import { PlusIcon } from './icons';
import { NAV, NEW_CARD_PATH, SIDEBAR, type NavKey } from './navigation';
import styles from './Sidebar.module.css';

/** Sidebar des iPads (iPadHeute.dc.html), ab 768 px Breite (A8). */
export function Sidebar({ active }: { active: NavKey | null }) {
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
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link to={NEW_CARD_PATH} className={cx(styles.create, tap.tap)}>
        <PlusIcon size={18} />
        Neue Karte
      </Link>
    </aside>
  );
}
