import type { ReactNode } from 'react';
import styles from './Toast.module.css';

export function Toast({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {sub ? <span className={styles.sub}>{sub}</span> : null}
      </div>
      {children}
    </div>
  );
}
