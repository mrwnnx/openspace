import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createActivity } from "@/lib/queries";
import { numeroJoignable, sendWhatsAppTemplate } from "@/lib/messaging/whatsapp";
import { recordWhatsAppSent } from "@/lib/whatsapp-inbox";
import { getWhatsAppSettings } from "@/lib/whatsapp-settings";
import { APP_TIMEZONE } from "@/lib/config";

/*
 * Rappels d'échéance par WhatsApp (27/09) : modèle UTILITY `echeance_rappel`
 * ({{1}} prénom, {{2}} montant, {{3}} date) pour une échéance non payée d'un
 * inscrit, aux moments choisis dans Paramètres (en jours : -3 = 3 jours avant).
 * Un rappel par moment et par échéance, jamais deux fois (payment_reminders).
 * Seulement entre 9 h et 20 h, heure locale. Appelé par le cron (~15 min).
 */

export const MODELE_RAPPEL = "echeance_rappel";
export const MOMENTS_POSSIBLES = [-7, -3, -1, 0, 3, 7];

const MOIS_AR = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 28 septembre » ou « 28 سبتمبر » : la date dans la langue du modèle Meta. */
const dateDansLangue = (iso: string, langue: string) =>
  `${Number(iso.slice(8, 10))} ${(langue.startsWith("ar") ? MOIS_AR : MOIS_FR)[Number(iso.slice(5, 7)) - 1]}`;

/** « j-3 », « j0 », « j+3 » : la clé d'un moment. */
export const cleMoment = (d: number) => (d === 0 ? "j0" : d > 0 ? `j+${d}` : `j${d}`);
export function libelleMoment(cle: string) {
  const d = Number(cle.slice(1));
  if (d === 0) return "le jour J";
  if (d === -1) return "la veille";
  return d < 0 ? `${-d} j avant` : `${d} j après`;
}

const jourLocal = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });

/** Les rappels dus à une date donnée : une ligne par échéance et par moment. */
async function candidats(aujourdhui: string, moments: number[]) {
  if (moments.length === 0) return [];
  const lignes = await Promise.all(
    moments.map((m) =>
      db.execute<{ schedule_id: string; lead_id: string; nom: string; prenom: string; numero: string | null; montant: string; due: string; kind: string }>(sql`
        select p.id as schedule_id, l.id as lead_id, l.full_name as nom,
               split_part(coalesce(nullif(l.first_name, ''), l.full_name), ' ', 1) as prenom,
               coalesce(nullif(c.whatsapp, ''), l.mobile_no) as numero,
               p.amount::text as montant, p.due_date::text as due, ${cleMoment(m)} as kind
        from payment_schedules p
        join leads l on l.id = p.lead_id
        left join contacts c on c.id = l.contact_id
        where p.is_paid = false and not l.no_payment_reminder
          and p.due_date = ${aujourdhui}::date - ${m}::int
          and c.whatsapp_unsubscribed_at is null and c.whatsapp_invalid_at is null
          and not exists (select 1 from payment_reminders r where r.schedule_id = p.id and r.kind = ${cleMoment(m)})`)
    )
  );
  return lignes.flat();
}

export async function envoyerRappelsEcheances(maintenant = new Date()) {
  const reglages = await getWhatsAppSettings();
  if (!reglages.remindersEnabled) return { envoyes: 0, echecs: 0, raison: "arrêtés" };
  const heure = Number(maintenant.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: APP_TIMEZONE }));
  if (heure < 9 || heure >= 20) return { envoyes: 0, echecs: 0, raison: "hors horaires" };
  // Tant que Meta n'a pas approuvé le modèle, rien ne part — et rien n'est
  // marqué « fait » : les rappels partiront au premier passage après l'approbation.
  const { listWhatsAppTemplates } = await import("@/lib/messaging/whatsapp");
  const modele = (await listWhatsAppTemplates()).find((t) => t.name === MODELE_RAPPEL);
  if (modele?.status !== "APPROVED") return { envoyes: 0, echecs: 0, raison: `modèle ${modele?.status ?? "absent"}` };

  const dues = (await candidats(jourLocal(maintenant), reglages.reminderOffsets)).slice(0, 50);
  let envoyes = 0;
  let echecs = 0;
  for (const d of dues) {
    // Marqué AVANT l'envoi : un double passage du cron ne peut pas l'envoyer deux fois.
    const [pris] = await db.execute<{ ok: number }>(sql`
      insert into payment_reminders (schedule_id, kind) values (${d.schedule_id}, ${d.kind})
      on conflict do nothing returning 1 as ok`);
    if (!pris) continue;
    if (!numeroJoignable(d.numero)) {
      await db.execute(sql`update payment_reminders set result = 'numéro injoignable' where schedule_id = ${d.schedule_id} and kind = ${d.kind}`);
      continue;
    }
    const montant = String(Math.round(Number(d.montant)));
    const langue = modele.language || "fr";
    const prenom = d.prenom || (langue.startsWith("ar") ? "صديقنا" : "cher·e participant·e");
    const r = await sendWhatsAppTemplate({ to: d.numero!, template: MODELE_RAPPEL, langue, variables: [prenom, montant, dateDansLangue(d.due, langue)] });
    await db.execute(sql`update payment_reminders set result = ${r.ok ? "envoyé" : r.error} where schedule_id = ${d.schedule_id} and kind = ${d.kind}`);
    if (!r.ok) {
      echecs++;
      continue;
    }
    const activite = await createActivity({
      referenceType: "lead",
      referenceId: d.lead_id,
      type: "whatsapp",
      direction: "outbound",
      subject: `Rappel d'échéance (${libelleMoment(d.kind)})`,
      content: `Rappel : ${montant} le ${d.due}`,
      createdBy: "automation",
    });
    await recordWhatsAppSent(r.id, activite.id, null, MODELE_RAPPEL);
    envoyes++;
  }
  return { envoyes, echecs };
}

/** Pour l'écran : les rappels des 7 prochains jours, et l'historique. */
export async function apercuRappels() {
  const reglages = await getWhatsAppSettings();
  const aVenir: { date: string; nom: string; leadId: string; montant: string; due: string; moment: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const jour = jourLocal(new Date(Date.now() + i * 86400000));
    for (const c of await candidats(jour, reglages.remindersEnabled ? reglages.reminderOffsets : [])) {
      aVenir.push({ date: jour, nom: c.nom, leadId: c.lead_id, montant: c.montant, due: c.due, moment: libelleMoment(c.kind) });
    }
  }
  const historique = await db.execute<{ nom: string; lead_id: string; kind: string; sent_at: string; result: string | null; montant: string; due: string }>(sql`
    select l.full_name as nom, l.id as lead_id, r.kind, r.sent_at::text, r.result, p.amount::text as montant, p.due_date::text as due
    from payment_reminders r join payment_schedules p on p.id = r.schedule_id join leads l on l.id = p.lead_id
    order by r.sent_at desc limit 50`);
  const exclus = await db.execute<{ id: string; nom: string }>(sql`select id, full_name as nom from leads where no_payment_reminder order by full_name`);
  return {
    actif: reglages.remindersEnabled,
    moments: reglages.reminderOffsets,
    aVenir,
    historique: historique.map((h) => ({ ...h, moment: libelleMoment(h.kind) })),
    exclus: [...exclus],
  };
}
