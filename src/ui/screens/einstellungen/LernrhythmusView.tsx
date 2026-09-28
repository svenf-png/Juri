import { useState } from 'react';
import { Link } from 'react-router';
import {
  clampNewPerDay,
  clampRetention,
  LEITNER_BOXES,
  MAX_INTERVAL_DAYS,
  RETENTION_MAX,
  RETENTION_MIN,
  RETENTION_PRESETS,
  setLeitnerDays,
  stepNewPerDay,
  type Algorithm,
  type LearningSettings,
} from '@/domain/scheduler/settings';
import { Button } from '../../components/Button';
import { ChevronRightIcon } from '../../components/icons';
import { BackLink, Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { Stepper } from '../../components/Stepper';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import styles from './Lernrhythmus.module.css';

const ALGORITHMS: readonly { value: Algorithm; label: string }[] = [
  { value: 'fsrs', label: 'FSRS (empfohlen)' },
  { value: 'leitner', label: 'Leitner-Kasten' },
];

/** Fächer von hell nach dunkel (Einstellungen.dc.html). */
const BOX_FILLS = [
  'var(--violet-100)',
  'var(--violet-200)',
  'var(--violet-300)',
  'var(--violet-400)',
  'var(--violet)',
] as const;

export interface LernrhythmusViewProps {
  back: { to: string; label: string };
  settings: LearningSettings;
  /** Beispiel „immer Gut“: die Abstände als Text („3 T“, „→ 9 T“ …). */
  examples: readonly string[];
  /** Anzahl der Fristen (M7); ohne Angabe steht keine Zahl an der Zeile. */
  deadlines?: number | undefined;
  onChange: (next: LearningSettings) => void;
}

/**
 * Lernrhythmus: Algorithmus, Behaltensquote (FSRS) oder Fächer (Leitner), neue Karten pro Tag,
 * Fristen. Rein; Speichern und die Beispielrechnung liefert Lernrhythmus.tsx.
 */
export function LernrhythmusView({
  back,
  settings,
  examples,
  deadlines,
  onChange,
}: LernrhythmusViewProps) {
  const [retention, setRetention] = useState(settings.retention);
  const [box, setBox] = useState<number | null>(null);
  // Kommt ein anderer Wert von außen (Voreinstellung getippt), folgt der Regler.
  const [seen, setSeen] = useState(settings.retention);
  if (seen !== settings.retention) {
    setSeen(settings.retention);
    setRetention(settings.retention);
  }

  const set = (change: Partial<LearningSettings>) => {
    onChange({ ...settings, ...change });
  };

  return (
    <Screen className={styles.screen}>
      <BackLink to={back.to} label={back.label} className={styles.back} />
      <h1 className={styles.title}>Lernrhythmus</h1>

      <div className={styles.algos} role="group" aria-label="Lernalgorithmus">
        {ALGORITHMS.map((a) => (
          <button
            key={a.value}
            type="button"
            className={cx(styles.algo, tap.tap, settings.algorithm === a.value && styles.algoOn)}
            aria-pressed={settings.algorithm === a.value}
            onClick={() => {
              set({ algorithm: a.value });
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {settings.algorithm === 'fsrs' ? (
        <div className={cx(styles.block, rise.rise)}>
          <div className={styles.presets} role="group" aria-label="Voreinstellung">
            {RETENTION_PRESETS.map((p) => {
              const on = settings.retention === p.retention;
              return (
                <button
                  key={p.name}
                  type="button"
                  className={cx(styles.preset, tap.tap, on && styles.presetOn)}
                  aria-pressed={on}
                  onClick={() => {
                    set({ retention: p.retention });
                  }}
                >
                  <span className={styles.presetName}>{p.name}</span>
                  <span className={styles.presetValue}>{p.retention} %</span>
                  <span className={styles.presetLoad}>{p.load}</span>
                </button>
              );
            })}
          </div>
          <label className={styles.slider}>
            <span className={styles.sliderHead}>
              <span>Ziel-Behaltensquote</span>
              <span className={styles.sliderValue}>{retention} %</span>
            </span>
            <input
              type="range"
              className={styles.range}
              min={RETENTION_MIN}
              max={RETENTION_MAX}
              step={1}
              value={retention}
              onChange={(e) => {
                const value = clampRetention(Number(e.target.value));
                setRetention(value);
                set({ retention: value });
              }}
            />
            <span className={styles.help}>
              Wahrscheinlichkeit, eine Karte bei Fälligkeit noch zu wissen. Höher heißt: kürzere
              Abstände, mehr Wiederholungen pro Tag.
            </span>
          </label>
          <div className={styles.example}>
            <span className={styles.exampleLabel}>Beispiel: immer „Gut“ (ca.)</span>
            <div className={styles.chips}>
              {examples.map((text, i) => (
                <span key={i} className={styles.chip}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={cx(styles.block, rise.rise)} style={{ gap: 12 }}>
          <span className={styles.leitnerLead}>
            Klassisches Karteikasten-System: gewusst rückt ein Fach weiter, nicht gewusst zurück in
            Fach 1.
          </span>
          <div className={styles.boxes}>
            {settings.leitnerDays.map((days, i) => (
              <button
                key={i}
                type="button"
                className={cx(styles.box, tap.tap, i === LEITNER_BOXES - 1 && styles.boxLast)}
                style={{ background: BOX_FILLS[i] }}
                aria-label={`Fach ${i + 1}, ${days} ${days === 1 ? 'Tag' : 'Tage'}, ändern`}
                onClick={() => {
                  setBox(i + 1);
                }}
              >
                <span className={styles.boxName}>Fach {i + 1}</span>
                <span className={styles.boxDays}>{days}</span>
                <span className={styles.boxUnit}>Tage</span>
              </button>
            ))}
          </div>
          <span className={styles.hintSmall}>Fach antippen, um Tage zu ändern.</span>
        </div>
      )}

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Neue Karten pro Tag</span>
          <Stepper
            value={settings.newPerDay}
            canDecrease={settings.newPerDay > 0}
            canIncrease={settings.newPerDay < 100}
            onDecrease={() => {
              set({ newPerDay: clampNewPerDay(stepNewPerDay(settings.newPerDay, -1)) });
            }}
            onIncrease={() => {
              set({ newPerDay: stepNewPerDay(settings.newPerDay, 1) });
            }}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Längster Abstand</span>
          <span className={styles.rowValue}>{MAX_INTERVAL_DAYS} Tage</span>
        </div>
        <Link to="/fristen" className={cx(styles.row, styles.rowLink)}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Fristen</span>
            <span className={styles.rowSub}>
              Examen, Klausuren, LL.M.: Abstände enden rechtzeitig davor
            </span>
          </span>
          <span
            className={styles.rowValue}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {deadlines === undefined ? null : (
              <span style={{ color: 'var(--violet)' }}>{deadlines}</span>
            )}
            <span className={styles.rowChevron}>
              <ChevronRightIcon size={16} strokeWidth={2.2} />
            </span>
          </span>
        </Link>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Lernschritte bei „Nochmal“</span>
          <span className={styles.rowValue}>1 min · 10 min</span>
        </div>
      </div>

      {/* Ergänzung: auf dem iPad führt die Sidebar hierher, der Weg zu Profil und Backup bleibt. */}
      <Link to="/einstellungen" className={cx(styles.row, styles.rowBorderless)} data-addition>
        <span className={styles.rowLabel}>Profil, Speicher und Backup</span>
        <span className={styles.rowChevron}>
          <ChevronRightIcon size={16} strokeWidth={2.2} />
        </span>
      </Link>

      <Sheet
        open={box !== null}
        onClose={() => {
          setBox(null);
        }}
        eyebrow="Leitner-Kasten"
        title={box === null ? '' : `Fach ${box}`}
      >
        {box === null ? null : (
          <BoxEditor
            box={box}
            settings={settings}
            onChange={onChange}
            onDone={() => {
              setBox(null);
            }}
          />
        )}
      </Sheet>
    </Screen>
  );
}

function BoxEditor({
  box,
  settings,
  onChange,
  onDone,
}: {
  box: number;
  settings: LearningSettings;
  onChange: (next: LearningSettings) => void;
  onDone: () => void;
}) {
  const days = settings.leitnerDays;
  const value = days[box - 1] ?? 1;
  const lower = box === 1 ? 1 : (days[box - 2] ?? 1);
  const upper = box === LEITNER_BOXES ? MAX_INTERVAL_DAYS : (days[box] ?? MAX_INTERVAL_DAYS);
  const change = (next: number) => {
    onChange({ ...settings, leitnerDays: setLeitnerDays(days, box, next) });
  };
  return (
    <>
      <p className={styles.sheetText}>
        Nach so vielen Tagen fragt Juri eine Karte in diesem Fach wieder ab. Möglich sind {lower}{' '}
        bis {upper} Tage, damit die Fächer aufsteigend bleiben.
      </p>
      <div className={styles.sheetControl}>
        <Stepper
          value={value}
          decreaseLabel="Einen Tag weniger"
          increaseLabel="Einen Tag mehr"
          canDecrease={value > lower}
          canIncrease={value < upper}
          onDecrease={() => {
            change(value - 1);
          }}
          onIncrease={() => {
            change(value + 1);
          }}
        />
      </div>
      <input
        type="range"
        className={styles.sheetRange}
        aria-label={`Tage in Fach ${box}`}
        min={lower}
        max={upper}
        step={1}
        value={value}
        onChange={(e) => {
          change(Number(e.target.value));
        }}
      />
      <Button variant="primary" block onClick={onDone}>
        Fertig
      </Button>
    </>
  );
}
