/**
 * Tagesziel „Anlegen“ im Erstellen-Bildschirm (Erstellen.dc.html: „3 von 5 heute“) und die
 * Meldung nach dem Speichern. Das Ziel ist bis M8 (Einstellungen) fest.
 */
import { groupDigits } from '../today/today';

export const DEFAULT_CREATE_GOAL = 5;

export interface CreateGoal {
  /** Füllstand der Leiste, 0 bis 100. */
  readonly pct: number;
  /** „3 von 5 heute“ oder, wenn erreicht, „5 heute angelegt“. */
  readonly text: string;
  readonly reached: boolean;
}

export function createGoal(made: number, goal = DEFAULT_CREATE_GOAL): CreateGoal {
  const reached = made >= goal;
  return {
    pct: goal <= 0 ? 100 : Math.min(100, Math.round((made / goal) * 100)),
    text: reached
      ? `${groupDigits(made)} heute angelegt`
      : `${groupDigits(made)} von ${goal} heute`,
    reached,
  };
}

/** Meldung nach dem Speichern; `made` zählt die soeben gespeicherte Karte mit. */
export function savedToast(made: number, total: number, goal = DEFAULT_CREATE_GOAL) {
  const insgesamt = `${groupDigits(total)} insgesamt`;
  return made === goal
    ? { title: 'Tagesziel Anlegen erreicht', sub: `${insgesamt} angelegt` }
    : { title: 'Karte gespeichert', sub: `${groupDigits(made)} heute angelegt · ${insgesamt}` };
}
