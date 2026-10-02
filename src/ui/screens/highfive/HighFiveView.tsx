import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { HighFivesModel, PersonView, ReceivedView } from '@/domain/highfive/view';
import { ChevronRightIcon, HighFiveIcon } from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { BackLink, Screen } from '../../components/Screen';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './HighFive.module.css';

export interface HighFiveViewProps {
  model: HighFivesModel;
  onGive: (person: PersonView) => void;
  onJustBecause: () => void;
  onContacts: () => void;
  /** Ein Kontakt in der Liste neben den Spalten (ab 1280 px): bearbeiten oder entfernen. */
  onContact: (id: string) => void;
  onOpenGreeting: () => void;
}

function Person({ person, onGive }: { person: PersonView; onGive: (p: PersonView) => void }) {
  return (
    <div className={styles.person}>
      <span className={styles.avatar} aria-hidden="true">
        {person.initial}
      </span>
      <div className={styles.personText}>
        <span className={styles.personName}>{person.name}</span>
        <span className={styles.win}>{person.win}</span>
      </div>
      <button
        type="button"
        className={cx(styles.give, person.given && styles.given, tap.tap)}
        aria-label={person.aria}
        aria-pressed={person.given}
        onClick={() => {
          onGive(person);
        }}
      >
        <HighFiveIcon size={22} />
      </button>
    </div>
  );
}

function ReceivedRow({ row }: { row: ReceivedView }) {
  return (
    <div className={styles.receivedRow}>
      <span className={styles.smallAvatar} aria-hidden="true">
        {row.initial}
      </span>
      <span className={styles.receivedText}>
        <strong>{row.name}</strong> {row.reason}
      </span>
      <span className={styles.when}>{row.when}</span>
    </div>
  );
}

/** High fives (`/high-fives`) nach HighFive.dc.html: Leute mit einem Erfolg, „einfach so“, Bekommen. */
export function HighFiveView(props: HighFiveViewProps) {
  const { model } = props;
  return (
    <Screen className={styles.screen} width="wide">
      <BackLink to="/erfolge" label="Erfolge" className={styles.back} />
      <header className={styles.head}>
        <h1 className={styles.title}>High fives</h1>
        <p className={styles.lead}>Für Erfolge der anderen. Oder einfach so.</p>
      </header>

      <div className={styles.cols}>
        <div className={styles.col}>
          {model.empty ? (
            <section className={styles.empty} aria-labelledby="hf-leer">
              <span id="hf-leer" className={styles.emptyTitle}>
                Noch keine Kontakte
              </span>
              <p className={styles.emptyText}>
                Kontakte entstehen, wenn du eine Datei von jemandem öffnest, der Juri nutzt. Dann
                siehst du hier, wofür es ein High five gibt.
              </p>
              <Link to="/teilen" className={cx(styles.go, tap.tap)}>
                Zu „Teilen“
              </Link>
            </section>
          ) : model.people.length > 0 ? (
            <section className={styles.section} aria-label="Neu von deinen Leuten">
              <span className={styles.label}>Neu von deinen Leuten</span>
              {model.people.map((person) => (
                <Person key={person.id} person={person} onGive={props.onGive} />
              ))}
            </section>
          ) : null}

          <button
            type="button"
            className={cx(styles.justBecause, tap.tap)}
            onClick={props.onJustBecause}
            aria-keyshortcuts="H"
          >
            <HighFiveIcon size={20} />
            Einfach so ein High five
            <Kbd>H</Kbd>
          </button>
        </div>

        <div className={styles.col}>
          {model.received.length > 0 ? (
            <section className={styles.section} aria-label="Bekommen">
              <span className={styles.label}>Bekommen</span>
              <div className={styles.received}>
                {model.received.map((row) => (
                  <ReceivedRow key={row.id} row={row} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Ab 1280 px (ADR-017): „Deine Leute“ fest sichtbar statt hinter „Alle anzeigen“. */}
        <aside className={styles.people} aria-label="Deine Leute">
          <div className={styles.peopleHead}>
            <span className={styles.label}>
              {model.empty ? 'Kontakte' : `Deine Leute (${String(model.contacts.length)})`}
            </span>
            {model.empty ? null : <Kbd>K</Kbd>}
          </div>
          {model.empty ? null : (
            <div className={styles.contactList}>
              {model.contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.contactRow}
                  onClick={() => {
                    props.onContact(c.id);
                  }}
                >
                  <span className={styles.contactAvatar} aria-hidden="true">
                    {c.initial}
                  </span>
                  <span className={styles.contactText}>
                    <span className={styles.contactName}>{c.name}</span>
                    <span className={styles.contactSub}>{c.sub}</span>
                  </span>
                  <ChevronRightIcon size={16} strokeWidth={2.2} className={styles.contactChevron} />
                </button>
              ))}
            </div>
          )}
          <div className={styles.greeting}>
            <span className={styles.footerMuted}>Gruß von jemandem?</span>
            <button
              type="button"
              className={cx(styles.footerLink, styles.greetingLink)}
              onClick={props.onOpenGreeting}
              aria-keyshortcuts="O"
            >
              Gruß-Datei öffnen
              <Kbd>O</Kbd>
            </button>
          </div>
        </aside>
      </div>

      <div className={styles.footer} data-addition>
        <span className={styles.footerMuted}>
          {model.empty ? 'Kontakte' : `Deine Leute (${String(model.contacts.length)})`}
        </span>
        {model.empty ? null : (
          <button
            type="button"
            className={cx(styles.footerLink, tap.tap)}
            onClick={props.onContacts}
          >
            Alle anzeigen
          </button>
        )}
      </div>
      <div className={styles.footer} data-addition>
        <span className={styles.footerMuted}>Gruß von jemandem?</span>
        <button
          type="button"
          className={cx(styles.footerLink, tap.tap)}
          onClick={props.onOpenGreeting}
        >
          Gruß-Datei öffnen
        </button>
      </div>
    </Screen>
  );
}

/**
 * Schicht über dem Bildschirm nach der Feier in HighFive.dc.html: Wellen, die Hand, „High five!“
 * und zwei Knöpfe. Ein natives <dialog> (Fokus und Escape vom Browser).
 */
export function Overlay({
  title = 'High five!',
  text,
  primary,
  onPrimary,
  closeLabel,
  onClose,
  children,
}: {
  title?: string;
  text: string;
  primary?: string;
  onPrimary?: () => void;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.overlay}
      aria-labelledby="hf-overlay-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.burst} aria-hidden="true">
        <span className={styles.wave} />
        <span className={styles.wave2} />
        <div className={styles.slap}>
          <HighFiveIcon size={64} strokeWidth={1.7} />
        </div>
      </div>
      <div className={styles.overlayText}>
        <h2 id="hf-overlay-title" className={styles.overlayTitle}>
          {title}
        </h2>
        <p className={styles.overlaySub} role="status">
          {text}
        </p>
      </div>
      <div className={styles.overlayActions}>
        {primary && onPrimary ? (
          <button type="button" className={cx(styles.send, tap.tap)} onClick={onPrimary}>
            {primary}
          </button>
        ) : null}
        {children}
        <button type="button" className={cx(styles.close, tap.tap)} onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </dialog>
  );
}
