import styles from './InstanceBanner.module.css';

export function InstanceBanner() {
  return (
    // Eine benannte Landmarke, damit der Hinweis nicht außerhalb aller Bereiche steht (axe „region“).
    <div className={styles.banner} role="region" aria-label="Testinstanz">
      <span className={styles.dot} aria-hidden="true" />
      Testinstanz · keine echten Lerndaten
    </div>
  );
}
