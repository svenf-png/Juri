import { DEFAULT_GOALS } from '@/domain/progress/goals';
import { AppShell } from '../../components/AppShell';
import { Sheet } from '../../components/Sheet';
import { Fertig } from '../lernen/Fertig';
import { designModel, feierBadge, fertigModel, leerModel } from './designFixture';
import { ErfolgeView } from './ErfolgeView';
import { MeilensteinSheet } from './MeilensteinSheet';
import { ZieleForm } from './ZieleSheet';

export type ErfolgeVariant = 'liste' | 'leer' | 'ziele' | 'fehler' | 'meilenstein' | 'fertig';

const noop = () => undefined;

/** Erfolge mit den Beispieldaten der Designs (/styleguide/erfolge/…), für den Bildvergleich. */
export function ErfolgeVorschau({ variant }: { variant: ErfolgeVariant }) {
  if (variant === 'fertig') return <Fertig model={fertigModel} onDone={noop} />;
  return (
    <AppShell active="erfolge">
      <ErfolgeView model={variant === 'leer' ? leerModel : designModel} />
      {variant === 'ziele' || variant === 'fehler' ? (
        <Sheet open onClose={noop} title="Tagesziele" titled>
          <ZieleForm
            initial={DEFAULT_GOALS}
            busy={false}
            failed={variant === 'fehler'}
            onSave={noop}
          />
        </Sheet>
      ) : null}
      {variant === 'meilenstein' ? (
        <MeilensteinSheet badge={feierBadge} more={0} onClose={noop} />
      ) : null}
    </AppShell>
  );
}
