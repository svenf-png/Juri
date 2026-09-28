import { Link } from 'react-router';
import { initialOf } from '@/domain/profile/name';
import { cx } from '../cx';
import styles from './Avatar.module.css';

/** Initiale im Kreis (Main.dc.html: 40 px, Profil.dc.html: 56 px). */
export function Avatar({ name, size = 40 }: { name: string; size?: 40 | 56 }) {
  return (
    <span className={cx(styles.avatar, size === 56 && styles.large)} aria-hidden="true">
      {initialOf(name)}
    </span>
  );
}

/** Avatar als Link zu den Einstellungen; Trefferfläche 44 px bei 40 px Optik (A1). */
export function AvatarLink({ name, className }: { name: string; className?: string | undefined }) {
  return (
    <Link
      to="/einstellungen"
      className={cx(styles.link, className)}
      aria-label="Profil und Einstellungen"
    >
      <Avatar name={name} />
    </Link>
  );
}
