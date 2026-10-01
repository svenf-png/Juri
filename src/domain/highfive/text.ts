/** Texte rund um High fives, die aus Plänen folgen (M11). Rein. */
import type { ReceivePlan } from './incoming';

/**
 * Warum eine Gruß-Datei nichts Neues bringt, in einem Satz; `null`, wenn mindestens ein
 * High five ankommt. Die Reihenfolge nennt zuerst, was der Person am meisten sagt.
 */
export function greetingProblem(plan: ReceivePlan): string | null {
  if (plan.kudos.length > 0) return null;
  const s = plan.skipped;
  if (s.fromSelf > 0) return 'Dieses High five hast du selbst geschickt.';
  if (s.foreign > 0) return 'Dieses High five ist für jemand anderen.';
  if (s.duplicate > 0) return 'Dieses High five hast du schon angenommen.';
  if (s.perDay > 0) return 'Von dieser Person kam an diesem Tag schon ein High five.';
  if (s.noSender > 0) return 'Der Absender dieser Datei ist unbekannt.';
  return 'In dieser Datei steckt kein neues High five.';
}

/** „ein High five“ · „3 High fives“ */
export function countText(n: number): string {
  return n === 1 ? 'ein High five' : `${String(n)} High fives`;
}

/** „Mara schickt dir ein High five für 12 Tage in Folge.“ (Anzahl und Anlass aus dem Plan) */
export function greetingText(name: string, plan: ReceivePlan): string {
  const first = plan.kudos[0];
  if (plan.kudos.length === 1 && first) {
    return `${name} schickt dir ein High five${first.win ? ` für ${first.win}` : ''}.`;
  }
  return `${name} schickt dir ${countText(plan.kudos.length)}.`;
}
