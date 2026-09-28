import { instanceById } from '@/app/instance';
import { ButtonAnchor, ButtonLink } from '../../components/Button';
import styles from './Einstellungen.module.css';

/**
 * Werkzeuge für Tests und Abnahme, bis M2 auf der Übergangs-Startseite: Styleguide,
 * Design-Vorschau von Heute, Geräte-Check (Testinstanz) bzw. Wechsel in die Testinstanz.
 */
export function Entwicklung() {
  const isTest = __JURI_INSTANCE__ === 'test';
  return (
    <section className={styles.section} aria-labelledby="entwicklung">
      <h2 id="entwicklung" className={styles.sectionLabel}>
        Entwicklung
      </h2>
      <div className={styles.buttons}>
        {isTest ? (
          <ButtonLink to="/geraetecheck" variant="ink" size="md" block>
            Geräte-Check starten
          </ButtonLink>
        ) : (
          <ButtonAnchor href={instanceById('test').base} variant="soft" size="md" block>
            Testinstanz öffnen
          </ButtonAnchor>
        )}
        <ButtonLink to="/styleguide" variant="soft" size="md" block>
          Styleguide ansehen
        </ButtonLink>
        <ButtonLink to="/styleguide/heute" variant="soft" size="md" block>
          Heute mit Beispieldaten
        </ButtonLink>
      </div>
    </section>
  );
}
