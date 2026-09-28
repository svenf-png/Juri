import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../cx';
import styles from './Screen.module.css';

export function Screen({
  children,
  width = 'narrow',
  className,
}: {
  children: ReactNode;
  width?: 'narrow' | 'wide';
  className?: string | undefined;
}) {
  return <main className={cx(styles.screen, styles[width], className)}>{children}</main>;
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={styles.back}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}

export function ScreenTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h1 className={styles.title}>{children}</h1>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </header>
  );
}
