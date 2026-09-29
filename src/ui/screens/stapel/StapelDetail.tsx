import { Link } from 'react-router';
import type { DeckModel } from '@/domain/library/library';
import {
  ChevronLeftIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from '../../components/icons';
import { Menu } from '../../components/Menu';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import styles from './Stapel.module.css';

export interface StapelDetailProps {
  model: DeckModel;
  /** Ein Rechtsgebiet ist umzuschalten (das letzte lässt der Bildschirm nicht abwählen). */
  onToggleArea: (areaId: string) => void;
  /** Kurzer Hinweis unter den Rechtsgebieten, z. B. „mindestens ein Rechtsgebiet“; sonst `null`. */
  notice: string | null;
  onEdit: () => void;
  onDelete: () => void;
  /** iPad: Rechtsgebiete hinzufügen. */
  onPickAreas: () => void;
}

const BAR_CLASS = { secure: 'barSecure', learning: 'barLearning', fresh: 'barFresh' } as const;

function Cta({ model, className }: { model: DeckModel; className: string | undefined }) {
  const { cta } = model;
  if (cta.kind === 'idle') {
    return (
      <p className={cx(className, styles.ctaIdle)} role="status">
        <span className={styles.ctaLong}>{cta.label}</span>
        <span className={styles.ctaShort}>{cta.short}</span>
      </p>
    );
  }
  return (
    <Link
      to={cta.kind === 'learn' ? `/lernen?stapel=${model.id}` : `/neu?stapel=${model.id}`}
      className={cx(className, tap.tap)}
    >
      <span className={styles.ctaLong}>{cta.label}</span>
      <span className={styles.ctaShort}>{cta.short}</span>
    </Link>
  );
}

function DeckMenu({
  onEdit,
  onDelete,
  align,
  size,
}: Pick<StapelDetailProps, 'onEdit' | 'onDelete'> & { align: 'left' | 'right'; size: 44 | 48 }) {
  return (
    <Menu
      label="Stapel-Menü"
      align={align}
      size={size}
      items={[
        {
          key: 'edit',
          label: 'Stapel bearbeiten',
          icon: <PencilIcon size={20} />,
          onSelect: onEdit,
        },
        {
          key: 'delete',
          label: 'Stapel löschen',
          icon: <TrashIcon size={20} />,
          danger: true,
          onSelect: onDelete,
        },
      ]}
    />
  );
}

/**
 * Stapel-Detail (Stapel.dc.html, iPadStapel.dc.html) als reine Ansicht eines DeckModel.
 * Beide Varianten stehen im DOM: unter 1100 px die iPhone-Variante, ab 1100 px die des iPad.
 */
export function StapelDetail({
  model,
  onToggleArea,
  notice,
  onEdit,
  onDelete,
  onPickAreas,
}: StapelDetailProps) {
  const members = model.areas.filter((a) => a.on);
  return (
    <div className={styles.detail}>
      {/* iPhone */}
      <div className={styles.phone}>
        <div className={styles.topbar}>
          <Link to="/stapel" className={styles.back}>
            <ChevronLeftIcon size={24} />
            Stapel
          </Link>
          <Link to="/teilen" className={cx(styles.round, tap.tap)} aria-label="Stapel teilen">
            <ShareIcon size={20} />
          </Link>
        </div>

        <header className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <h1 className={cx('display', styles.deckTitle)}>{model.name}</h1>
            <DeckMenu onEdit={onEdit} onDelete={onDelete} align="right" size={44} />
          </div>
          {model.norm ? <p className={styles.sub}>{model.norm}</p> : null}
        </header>

        <section className={styles.areas} aria-labelledby="stapel-gebiete">
          <h2 id="stapel-gebiete" className={styles.sectionLabel}>
            Rechtsgebiete
          </h2>
          <div className={styles.areaChips}>
            {model.areas.map((a) => (
              <button
                key={a.id}
                type="button"
                className={cx(styles.areaChip, tap.tap, a.on && styles.areaChipOn)}
                aria-pressed={a.on}
                aria-disabled={a.locked || undefined}
                onClick={() => {
                  onToggleArea(a.id);
                }}
              >
                {a.on ? <CheckIcon size={16} /> : <PlusIcon size={16} strokeWidth={2.6} />}
                {a.name}
              </button>
            ))}
          </div>
          {notice ? (
            <p className={styles.hint} role="status">
              {notice}
            </p>
          ) : null}
        </section>

        {model.bar.length > 0 ? (
          <div className={styles.progress}>
            <div className={styles.bar} aria-hidden="true">
              {model.bar.map((p, i) =>
                p.pct > 0 ? (
                  <span
                    key={p.key}
                    className={cx(styles.barPart, styles[BAR_CLASS[p.key]])}
                    style={{
                      width: `${p.pct}%`,
                      animationDelay: `${[0.15, 0.25, 0.35][i] ?? 0.35}s`,
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className={styles.legend}>
              {model.bar.map((p) => (
                <li key={p.key} className={styles.legendItem}>
                  <span
                    className={cx(styles.swatch, styles[BAR_CLASS[p.key]])}
                    aria-hidden="true"
                  />
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Cta model={model} className={styles.cta} />

        <section className={styles.cards} aria-labelledby="stapel-karten">
          <div className={styles.cardsHead}>
            <h2 id="stapel-karten" className={styles.sectionLabel}>
              {model.cardCount}
            </h2>
            <Link to={`/neu?stapel=${model.id}`} className={styles.textLink}>
              + Karte
            </Link>
          </div>
          {model.cards.length === 0 ? (
            <div className={styles.dashed}>
              <p className={styles.dashedTitle}>Hier erscheinen deine Karten</p>
              <p className={styles.dashedText}>Lege die erste an, dann steht hier der Überblick.</p>
            </div>
          ) : (
            model.cards.map((c) => (
              <Link key={c.id} to={`/karte/${c.id}`} className={cx(styles.cardRow, tap.tap)}>
                <span className={styles.typeChip}>{c.type}</span>
                <span className={styles.cardTitle}>{c.title}</span>
                {c.due !== undefined ? (
                  <span className={styles.cardDue} data-addition>
                    {c.due}
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </section>
      </div>

      {/* iPad */}
      <div className={styles.pad}>
        <header className={styles.padHead}>
          <div className={styles.padTitleBlock}>
            <div className={styles.padTitleRow}>
              <h2 className={cx('display', styles.padTitle)}>{model.name}</h2>
              <DeckMenu onEdit={onEdit} onDelete={onDelete} align="left" size={44} />
            </div>
            <p className={styles.padSub}>
              {[model.norm, model.cardCount].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={styles.padActions}>
            <Link to="/teilen" className={cx(styles.padRound, tap.tap)} aria-label="Stapel teilen">
              <ShareIcon size={20} />
            </Link>
            <Cta model={model} className={styles.padCta} />
          </div>
        </header>

        <div className={styles.padChips}>
          {members.map((a) => (
            <button
              key={a.id}
              type="button"
              className={cx(styles.padChip, styles.padChipOn, tap.tap)}
              aria-label={a.locked ? `${a.name}, letztes Rechtsgebiet` : `${a.name} entfernen`}
              aria-disabled={a.locked || undefined}
              onClick={() => {
                onToggleArea(a.id);
              }}
            >
              {a.name}
            </button>
          ))}
          <button type="button" className={cx(styles.padChip, tap.tap)} onClick={onPickAreas}>
            + Rechtsgebiet
          </button>
        </div>
        {notice ? <p className={styles.hint}>{notice}</p> : null}

        {model.bar.length > 0 ? (
          <div className={styles.padProgress} aria-hidden="true">
            <div className={styles.padBar}>
              {model.bar.map((p) =>
                p.pct > 0 ? (
                  <span
                    key={p.key}
                    className={cx(styles.padBarPart, styles[BAR_CLASS[p.key]])}
                    style={{ width: `${p.pct}%` }}
                  />
                ) : null,
              )}
            </div>
            <div className={styles.padLegend}>
              <span>sicher</span>
              <span>im Lernen</span>
              <span>neu</span>
            </div>
          </div>
        ) : null}

        {model.cards.length === 0 ? (
          <div className={styles.dashed}>
            <p className={styles.dashedTitle}>Hier erscheinen deine Karten</p>
            <p className={styles.dashedText}>Lege die erste an, dann steht hier der Überblick.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {model.cards.map((c) => (
              <Link key={c.id} to={`/karte/${c.id}`} className={cx(styles.tile, rise.rise)}>
                <span className={styles.tileHead}>
                  <span className={styles.tileType}>{c.type}</span>
                  <span className={styles.tileNorm}>{c.norm}</span>
                </span>
                <span className={styles.tileTitle}>{c.title}</span>
                {c.due !== undefined ? (
                  <span className={styles.tileDue} data-addition>
                    {c.due}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
