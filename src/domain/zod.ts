import { z } from 'zod';

/*
 * zod ohne Code-Erzeugung: Die CSP erlaubt kein 'unsafe-eval' (ADR-005). Der Aufruf muss vor
 * dem ersten Schema stehen, deshalb importieren alle Schemas `z` aus diesem Modul.
 */
z.config({ jitless: true });

export { z };
