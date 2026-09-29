import { AppShell } from '../../components/AppShell';
import { createGoal } from '@/domain/cards/goal';
import { CardScreen } from '../erstellen/CardScreen';
import { EMPTY_FORM } from '../erstellen/form';
import { Bibliothek } from './Bibliothek';
import { padDeck, padLibrary, phoneDeck, phoneLibrary } from './designFixture';
import styles from './Stapel.module.css';
import { StapelDetail } from './StapelDetail';

const noop = () => undefined;

/**
 * Stapel-Bereich mit den Beispieldaten der Designs, samt Tab-Bar bzw. Sidebar
 * (Bildvergleich mit Bibliothek.dc.html, Stapel.dc.html und iPadStapel.dc.html).
 * `phone`: Übersicht oder Detail eines Stapels; `pad`: Master-Detail ab 1100 px.
 */
export function StapelVorschau({ screen }: { screen: 'liste' | 'detail' | 'ipad' }) {
  const pad = screen === 'ipad';
  return (
    <AppShell active="stapel" pushed={screen === 'detail'}>
      <main className={styles.stapel} data-view={screen === 'liste' ? 'list' : 'detail'}>
        <Bibliothek
          model={pad ? padLibrary : phoneLibrary}
          query=""
          onQuery={noop}
          hits={null}
          tokens={[]}
          selectedId="amt"
          onFilter={noop}
          onNewDeck={noop}
          onManageAreas={noop}
        />
        <StapelDetail
          model={pad ? padDeck : phoneDeck}
          onToggleArea={noop}
          notice={null}
          onEdit={noop}
          onDelete={noop}
          onPickAreas={noop}
        />
      </main>
    </AppShell>
  );
}

/** Erstellen mit den Beispieldaten von Erstellen.dc.html („3 von 5 heute“). */
export function ErstellenVorschau() {
  return (
    <CardScreen
      mode="new"
      initial={EMPTY_FORM}
      deckLabel="Diebstahl & Betrug · SR"
      onPickDeck={noop}
      onSubmit={() => Promise.resolve(true)}
      onClose={noop}
      goal={createGoal(3)}
    />
  );
}
