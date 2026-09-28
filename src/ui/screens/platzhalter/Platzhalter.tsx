import { BackLink, Screen, ScreenTitle } from '../../components/Screen';
import type { PlatzhalterProps } from './texte';
import styles from './Platzhalter.module.css';

/** Vorläufiger Bildschirm für Bereiche, die ein späterer Meilenstein baut. */
export function Platzhalter({ title, milestone, text, back = false }: PlatzhalterProps) {
  return (
    <Screen>
      {back ? <BackLink to="/" label="Heute" /> : null}
      <span className={styles.label}>Kommt mit {milestone}</span>
      <ScreenTitle lead={text}>{title}</ScreenTitle>
    </Screen>
  );
}
