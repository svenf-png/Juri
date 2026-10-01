import { Link } from 'react-router';
import type { LibraryModel, StackRow } from '@/domain/library/library';
import { highlight, type SearchHit } from '@/domain/library/search';
import { PencilIcon, SearchIcon, StackIcon } from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { Button } from '../../components/Button';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import styles from './Stapel.module.css';

export interface BibliothekProps {
  model: LibraryModel;
  query: string;
  onQuery: (query: string) => void;
  /** Treffer der Suche; `null`, solange nicht gesucht wird. */
  hits: readonly SearchHit[] | null;
  tokens: readonly string[];
  /** Gewählter Stapel (nur ab 1100 px hervorgehoben). */
  selectedId?: string | undefined;
  onFilter: (id: string) => void;
  onNewDeck: () => void;
  onManageAreas: () => void;
}

function EmptyBlock({
  icon,
  title,
  text,
  action,
}: {
  icon: 'stack' | 'search';
  title: string;
  text: string;
  action?: { label: string; onClick: () => void; primary: boolean };
}) {
  return (
    <div className={cx(styles.empty, rise.rise)}>
      <span className={styles.emptyIcon}>
        {icon === 'stack' ? (
          <StackIcon size={32} strokeWidth={1.9} />
        ) : (
          <SearchIcon size={32} strokeWidth={1.9} />
        )}
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{text}</p>
      {action ? (
        <Button
          variant={action.primary ? 'primary' : 'outline'}
          size={action.primary ? 'lg' : 'md'}
          block
          className={styles.emptyAction}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function Stack({ stack, selected }: { stack: StackRow; selected: boolean }) {
  return (
    <Link
      to={`/stapel/${stack.id}`}
      className={cx(styles.row, tap.tap, selected && styles.rowSelected)}
      aria-current={selected ? 'true' : undefined}
    >
      <span className={styles.rowText}>
        <span className={styles.rowName}>{stack.name}</span>
        <span className={styles.rowMeta}>
          {stack.meta}
          {stack.also ? <span className={styles.alsoInline}> · {stack.also}</span> : null}
        </span>
      </span>
      {stack.also ? <span className={styles.alsoTag}>{stack.also}</span> : null}
      <span className={cx(styles.due, stack.due > 0 && styles.dueOn)}>{stack.due}</span>
    </Link>
  );
}

function Hit({ hit, tokens }: { hit: SearchHit; tokens: readonly string[] }) {
  return (
    <Link to={`/karte/${hit.id}`} className={cx(styles.hit, tap.tap)}>
      <span className={styles.typeChip}>{hit.type}</span>
      <span className={styles.hitText}>
        <span className={styles.hitTitle}>
          {highlight(hit.title, tokens).map((part, i) =>
            part.hit ? (
              <mark key={i} className={styles.mark}>
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </span>
        <span className={styles.hitMeta}>{hit.meta}</span>
      </span>
    </Link>
  );
}

/**
 * Stapel-Übersicht (Bibliothek.dc.html, Liste in iPadStapel.dc.html) als reine Ansicht eines
 * LibraryModel. Ein DOM für alle Breiten; ab 1100 Pixeln wird daraus die Liste des Master-Detail.
 */
export function Bibliothek({
  model,
  query,
  onQuery,
  hits,
  tokens,
  selectedId,
  onFilter,
  onNewDeck,
  onManageAreas,
}: BibliothekProps) {
  const searching = hits !== null;
  return (
    <section className={styles.list} aria-labelledby="stapel-titel">
      <div className={styles.head}>
        <h1 id="stapel-titel" className={cx('display', styles.h1)}>
          Stapel
        </h1>
        {model.empty ? null : (
          <button type="button" className={styles.textButton} onClick={onNewDeck}>
            + Stapel
          </button>
        )}
      </div>

      <label className={styles.search}>
        <SearchIcon size={18} />
        <span className={styles.visuallyHidden}>Suchen</span>
        <input
          type="search"
          data-shortcut-search=""
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
          }}
          placeholder="Karten, Normen, Tags"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Kbd>/</Kbd>
      </label>

      {model.empty ? null : (
        <div className={styles.filters} role="group" aria-label="Rechtsgebiet">
          {model.filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cx(styles.chip, tap.tap, f.id === model.filter && styles.chipOn)}
              aria-pressed={f.id === model.filter}
              onClick={() => {
                onFilter(f.id);
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className={cx(styles.chip, styles.chipIcon, tap.tap)}
            aria-label="Rechtsgebiete verwalten"
            onClick={onManageAreas}
          >
            <PencilIcon size={16} />
          </button>
        </div>
      )}

      {searching ? (
        hits.length > 0 ? (
          <section className={styles.hits} aria-label="Suchergebnisse">
            <p className={styles.sectionLabel} role="status">
              {hits.length === 1 ? '1 Treffer' : `${hits.length} Treffer`}
            </p>
            {hits.map((hit) => (
              <Hit key={hit.id} hit={hit} tokens={tokens} />
            ))}
          </section>
        ) : (
          <EmptyBlock
            icon="search"
            title="Nichts gefunden"
            text="Die Suche schaut in Fragen, Antworten, Lücken, Normen, Tags und Stapelnamen. Prüfe die Schreibweise oder nimm einen kürzeren Begriff."
            action={{
              label: 'Suche zurücksetzen',
              primary: false,
              onClick: () => {
                onQuery('');
              },
            }}
          />
        )
      ) : model.empty ? (
        <EmptyBlock
          icon="stack"
          title="Noch keine Stapel"
          text="Ein Stapel sammelt Karten zu einem Thema, zum Beispiel „Deliktsrecht“. Ordne ihn einem oder mehreren Rechtsgebieten zu."
          action={{ label: 'Ersten Stapel anlegen', primary: true, onClick: onNewDeck }}
        />
      ) : model.filterEmpty ? (
        <p className={styles.emptyText}>In diesem Rechtsgebiet liegt noch kein Stapel.</p>
      ) : (
        <div className={styles.groups}>
          {model.groups.map((g) => (
            <div key={g.id} className={cx(styles.group, rise.rise)}>
              <div className={styles.groupHead}>
                <span className={styles.badge}>{g.code}</span>
                <h2 className={styles.groupName}>{g.name}</h2>
              </div>
              {g.stacks.map((s) => (
                <Stack key={s.id} stack={s} selected={s.id === selectedId} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
