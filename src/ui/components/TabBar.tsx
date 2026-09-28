import { Link } from 'react-router';
import { cx } from '../cx';
import tap from '../motion/tap.module.css';
import { PlusIcon } from './icons';
import { NAV, NEW_CARD_PATH, TAB_BAR, type NavKey } from './navigation';
import styles from './TabBar.module.css';

function Tab({ item, active }: { item: NavKey; active: boolean }) {
  const { to, label, Icon } = NAV[item];
  return (
    <Link
      to={to}
      className={cx(styles.tab, active && styles.active)}
      aria-current={active ? 'page' : undefined}
    >
      <Icon />
      {label}
    </Link>
  );
}

/** Tab-Bar des iPhones (Main.dc.html), unter 768 px Breite (A8). */
export function TabBar({ active, hidden = false }: { active: NavKey | null; hidden?: boolean }) {
  const [a, b, c, d] = TAB_BAR;
  return (
    <nav className={styles.bar} aria-label="Hauptnavigation" hidden={hidden}>
      <Tab item={a} active={active === a} />
      <Tab item={b} active={active === b} />
      <Link to={NEW_CARD_PATH} className={cx(styles.create, tap.tap)} aria-label="Neue Karte">
        <PlusIcon />
      </Link>
      <Tab item={c} active={active === c} />
      <Tab item={d} active={active === d} />
    </nav>
  );
}
