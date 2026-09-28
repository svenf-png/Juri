import { liveQuery } from 'dexie';

/** Beobachtet eine Abfrage (Dexie liveQuery) und meldet jedes neue Ergebnis; gibt Abmelden zurück. */
export function observe<T>(
  query: () => Promise<T>,
  onValue: (value: T) => void,
  onError: (error: unknown) => void,
): () => void {
  const subscription = liveQuery(query).subscribe({ next: onValue, error: onError });
  return () => {
    subscription.unsubscribe();
  };
}
