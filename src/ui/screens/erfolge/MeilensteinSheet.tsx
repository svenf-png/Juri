import type { Badge } from '@/domain/progress/milestones';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { BadgeMark } from './ErfolgeView';
import styles from './MeilensteinSheet.module.css';

/** Feier für einen neu freigeschalteten Meilenstein (Sheet in Erfolge). */
export function MeilensteinSheet({
  badge,
  more,
  onClose,
}: {
  badge: Badge | null;
  /** Weitere Meilensteine, die danach gefeiert werden. */
  more: number;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={badge !== null}
      onClose={onClose}
      eyebrow="Neuer Meilenstein"
      title={badge?.name ?? ''}
      compact
    >
      {badge ? (
        <div className={styles.body}>
          <div className={styles.mark}>
            <BadgeMark badge={{ ...badge, fresh: false }} size={96} />
          </div>
          <p className={styles.text}>{badge.text}</p>
          {more > 0 ? (
            <p className={styles.more}>
              {more === 1
                ? 'Noch ein Meilenstein wartet.'
                : `Noch ${String(more)} Meilensteine warten.`}
            </p>
          ) : null}
          <Button variant="primary" block onClick={onClose}>
            {more > 0 ? 'Weiter' : 'Super'}
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
