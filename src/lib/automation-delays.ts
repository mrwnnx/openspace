/**
 * Délais proposés dans l'écran d'automatisation.
 *
 * Module NEUTRE (ni "server-only" ni "use client") : la même liste sert à
 * l'écran (client) et à la validation serveur. Mise dans `automations.ts`
 * — qui est "server-only" — elle casserait le build du composant client.
 *
 * Au-delà de 0, la précision est au quart d'heure : la file part avec le
 * workflow GitHub, qui a le droit d'être en retard. D'où le « ≈ » : ne pas
 * promettre la minute.
 */
import { decalageFuseau } from "@/lib/config";
export const AUTOMATION_DELAYS = [
  { minutes: 0, label: "Immédiat" },
  { minutes: 15, label: "≈ 15 min" },
  { minutes: 60, label: "≈ 1 h" },
  { minutes: 180, label: "≈ 3 h" },
  { minutes: 1440, label: "≈ 1 jour" },
  { minutes: 2880, label: "≈ 2 jours" },
  { minutes: 10080, label: "≈ 7 jours" },
] as const;

export function delayLabel(minutes: number): string {
  return AUTOMATION_DELAYS.find((d) => d.minutes === minutes)?.label ?? `${minutes} min`;
}

// ── Le moment d'un envoi « J+n à h h », heure locale (APP_TIMEZONE) ─────
const decalageMs = (d: Date) => decalageFuseau(d) * 60_000;

/** Une heure « locale » (champs UTC d'un Date décalé) → l'instant UTC réel, heure d'été comprise. */
function versUtc(local: Date, repere: Date): Date {
  const approx = new Date(local.getTime() - decalageMs(repere));
  return new Date(local.getTime() - decalageMs(approx));
}

/**
 * L'échéance d'une règle « J+delayDays à atHour » comptée depuis `entree`.
 * Si le moment est déjà passé (J+0 à 10 h, entré à 14 h), c'est le lendemain.
 */
export function echeanceLocale(entree: Date, delayDays: number, atHour: number): Date {
  const local = new Date(entree.getTime() + decalageMs(entree));
  local.setUTCDate(local.getUTCDate() + delayDays);
  local.setUTCHours(atHour, 0, 0, 0);
  let echeance = versUtc(local, entree);
  if (echeance.getTime() <= entree.getTime()) {
    local.setUTCDate(local.getUTCDate() + 1);
    echeance = versUtc(local, entree);
  }
  return echeance;
}

/** « J+3 · 18 h » pour le badge de colonne ; sinon le libellé du délai en minutes. */
export function timingLabel(r: { delayMinutes: number; delayDays?: number | null; atHour?: number | null }): string {
  if (r.atHour != null) return `J+${r.delayDays ?? 0} · ${r.atHour} h`;
  return delayLabel(r.delayMinutes);
}
