import styles from './InstanceBanner.module.css';

export function InstanceBanner() {
  return (
    <div className={styles.banner} role="note">
      <span className={styles.dot} aria-hidden="true" />
      Testinstanz · keine echten Lerndaten
    </div>
  );
}
