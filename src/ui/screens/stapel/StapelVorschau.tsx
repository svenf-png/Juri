import { AppShell } from '../../components/AppShell';
import { createGoal } from '@/domain/cards/goal';
import { CardScreen } from '../erstellen/CardScreen';
import { EMPTY_FORM } from '../erstellen/form';
import { useMediaQuery } from '../../useMediaQuery';
import { Bibliothek } from './Bibliothek';
import { desktopDeck, padDeck, padLibrary, phoneDeck, phoneLibrary } from './designFixture';
import styles from './Stapel.module.css';
import { StapelDetail } from './StapelDetail';

const noop = () => undefined;

/**
 * Stapel-Bereich mit den Beispieldaten der Designs, samt Tab-Bar bzw. Sidebar
 * (Bildvergleich mit Bibliothek.dc.html, Stapel.dc.html und iPadStapel.dc.html).
 * `phone`: Übersicht oder Detail eines Stapels; `pad`: Master-Detail ab 1100 px; `desktop`: wie
 * `pad`, dazu mit Fälligkeit an den Karten (Tabelle ab 1280 px, DesktopStapel.dc.html).
 */
export function StapelVorschau({ screen }: { screen: 'liste' | 'detail' | 'ipad' | 'desktop' }) {
  const pad = screen === 'ipad' || screen === 'desktop';
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
          model={screen === 'desktop' ? desktopDeck : pad ? padDeck : phoneDeck}
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

/** Beispielkarte des Desktop-Boards (DesktopErstellen.dc.html): Formular gefüllt, Stapel mit Gebiet. */
const DESKTOP_FORM = {
  ...EMPTY_FORM,
  front: 'Was versteht man unter Gewahrsam?',
  back: 'Die von einem Herrschaftswillen getragene tatsächliche Sachherrschaft eines Menschen über eine Sache.',
  norm: '§ 242 StGB',
  tags: '#Klausur',
};

/**
 * Erstellen mit den Beispieldaten von Erstellen.dc.html („3 von 5 heute“); ab 1280 px mit der
 * gefüllten Karte des Desktop-Boards, damit die Vorschau etwas zeigt.
 */
export function ErstellenVorschau() {
  const desktop = useMediaQuery('(min-width: 1280px)');
  return (
    <CardScreen
      mode="new"
      initial={desktop ? DESKTOP_FORM : EMPTY_FORM}
      deckLabel="Diebstahl & Betrug · SR"
      deck={{ id: 'diebstahl', name: 'Diebstahl & Betrug', areaCodes: 'SR' }}
      onPickDeck={noop}
      onSubmit={() => Promise.resolve(true)}
      onClose={noop}
      goal={createGoal(3)}
    />
  );
}
