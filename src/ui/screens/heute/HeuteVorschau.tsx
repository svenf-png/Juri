import { AppShell } from '../../components/AppShell';
import { DESIGN_NAME, designModel, erledigtModel } from './designFixture';
import { HeuteView } from './HeuteView';

/** Heute mit den Beispieldaten der Designs, samt Tab-Bar bzw. Sidebar (Screenshot-Test). */
export function HeuteVorschau() {
  return (
    <AppShell active="heute">
      <HeuteView model={designModel} name={DESIGN_NAME} />
    </AppShell>
  );
}

/** Heute nach dem Lernen (HeuteErledigt.dc.html): alles erledigt, Tagesziel voll. */
export function HeuteErledigtVorschau() {
  return (
    <AppShell active="heute">
      <HeuteView model={erledigtModel} name={DESIGN_NAME} />
    </AppShell>
  );
}
