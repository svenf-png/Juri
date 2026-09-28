import type { CSSProperties } from 'react';
import { cx } from '../cx';
import styles from './AppIconMark.module.css';

export function AppIconMark({
  size = 96,
  variant = 'app',
}: {
  size?: number;
  variant?: 'app' | 'test';
}) {
  const style = { width: size, height: size, '--scale': size / 200 } as CSSProperties;
  return (
    <div className={styles.frame} style={style} aria-hidden="true">
      <div className={cx(styles.icon, variant === 'test' && styles.test)}>
        <div className={styles.back} />
        <div className={styles.front}>
          <span className={styles.letter}>J</span>
        </div>
      </div>
    </div>
  );
}
