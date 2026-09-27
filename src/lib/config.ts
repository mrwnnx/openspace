/**
 * Réglages d'installation, lus dans l'environnement. Module pur : aucun
 * import, aucun effet de bord — lu côté serveur comme côté client.
 * Une valeur vide vaut « non configuré » : la fonctionnalité se coupe.
 */
const lire = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const APP_TIMEZONE = lire(process.env.NEXT_PUBLIC_APP_TIMEZONE) ?? "Africa/Tunis";
export const DEFAULT_COUNTRY_CODE = (lire(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE) ?? "216").replace(/\D/g, "");
export const NATIONAL_NUMBER_LENGTH = Number(lire(process.env.NEXT_PUBLIC_NATIONAL_NUMBER_LENGTH) ?? "8");
export const RESEND_SENDER_DOMAIN = lire(process.env.RESEND_SENDER_DOMAIN);
export const WP_SITE_URL = lire(process.env.WP_SITE_URL);
export const WHATSAPP_FLOW_INSCRIPTION_ID = lire(process.env.WHATSAPP_FLOW_INSCRIPTION_ID);
export const VAPID_PUBLIC_KEY = lire(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
export const VAPID_SUBJECT = lire(process.env.VAPID_SUBJECT);
export const TUTOR_ALUMNI_BOOTCAMP = lire(process.env.TUTOR_ALUMNI_BOOTCAMP);
export const TUTOR_ALUMNI_TAG = lire(process.env.TUTOR_ALUMNI_TAG) ?? "Alumni";

/** Minutes d'avance de APP_TIMEZONE sur UTC à l'instant donné (heure d'été comprise). */
export function decalageFuseau(at: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return Math.round((local - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}
