import { useState } from 'react';
import {
  clampCreateGoal,
  CREATE_GOAL_MAX,
  CREATE_GOAL_MIN,
  LEARN_GOAL_MAX,
  LEARN_GOAL_MIN,
  learnStep,
  type Goals,
} from '@/domain/progress/goals';
import { saveGoals } from '@/features/progress/actions';
import { Sheet } from '../../components/Sheet';
import { Stepper } from '../../components/Stepper';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './ZieleSheet.module.css';

const SAVE_FAILED =
  'Das hat nicht geklappt. Deine Ziele sind unverändert. Bitte versuche es noch einmal.';

/** Inhalt des Sheets „Tagesziele“; rein, das Speichern übernimmt der Aufrufer. */
export function ZieleForm({
  initial,
  failed,
  busy,
  onSave,
}: {
  initial: Goals;
  failed: boolean;
  busy: boolean;
  onSave: (goals: Goals) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <p className={styles.lead}>
        Ein Tag zählt für deine Serie, sobald du eines der beiden Ziele erreichst.
      </p>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.text}>
            <span className={styles.title}>Karten lernen</span>
            <span className={styles.hint}>Karten, die du mindestens einmal bewertest</span>
          </span>
          <Stepper
            value={draft.learn}
            decreaseLabel="Ziel Lernen senken"
            increaseLabel="Ziel Lernen erhöhen"
            canDecrease={draft.learn > LEARN_GOAL_MIN}
            canIncrease={draft.learn < LEARN_GOAL_MAX}
            onDecrease={() => {
              setDraft({ ...draft, learn: learnStep(draft.learn, -1) });
            }}
            onIncrease={() => {
              setDraft({ ...draft, learn: learnStep(draft.learn, 1) });
            }}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.text}>
            <span className={styles.title}>Karten anlegen</span>
            <span className={styles.hint}>Neue Karten an einem Tag</span>
          </span>
          <Stepper
            value={draft.create}
            decreaseLabel="Ziel Anlegen senken"
            increaseLabel="Ziel Anlegen erhöhen"
            canDecrease={draft.create > CREATE_GOAL_MIN}
            canIncrease={draft.create < CREATE_GOAL_MAX}
            onDecrease={() => {
              setDraft({ ...draft, create: clampCreateGoal(draft.create - 1) });
            }}
            onIncrease={() => {
              setDraft({ ...draft, create: clampCreateGoal(draft.create + 1) });
            }}
          />
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={draft.pause}
        className={cx(styles.switch, tap.tap)}
        onClick={() => {
          setDraft({ ...draft, pause: !draft.pause });
        }}
      >
        <span className={styles.text}>
          <span className={styles.title}>Pausentag</span>
          <span className={styles.hint}>Ein freier Tag pro Woche, die Serie bleibt stehen</span>
        </span>
        <span className={cx(styles.track, draft.pause && styles.trackOn)}>
          <span className={cx(styles.knob, draft.pause && styles.knobOn)} />
        </span>
      </button>
      {failed ? (
        <p className={styles.error} role="alert">
          {SAVE_FAILED}
        </p>
      ) : null}
      <button type="submit" className={cx(styles.save, tap.tap)} disabled={busy}>
        Ziele speichern
      </button>
    </form>
  );
}

/** Tagesziele einstellen (Sheet in Erfolge). */
export function ZieleSheet({
  open,
  goals,
  onClose,
}: {
  open: boolean;
  goals: Goals;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Tagesziele" titled>
      {open ? (
        <ZieleForm
          initial={goals}
          busy={busy}
          failed={failed}
          onSave={(next) => {
            setBusy(true);
            setFailed(false);
            saveGoals(next)
              .then(() => {
                setBusy(false);
                onClose();
              })
              .catch(() => {
                setBusy(false);
                setFailed(true);
              });
          }}
        />
      ) : null}
    </Sheet>
  );
}
