import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { APP_TIMEZONE } from "@/lib/config";

/*
 * « Ma journée » (27/09) : ce qui attend un geste aujourd'hui, en un seul
 * endroit — conversations WhatsApp sans réponse (fenêtre de 24 h qui se ferme),
 * propositions de l'assistant pas encore traitées, tâches dues. Les appels à
 * passer viennent de getCallQueue, déjà classés.
 */

export type MessageEnAttente = {
  leadId: string;
  nom: string;
  apercu: string | null;
  recuLe: string;
  heuresRestantes: number; // avant la fermeture de la fenêtre de 24 h
  suiviPar: string | null;
};

/**
 * Les conversations dont le DERNIER message vient du lead, fenêtre encore
 * ouverte — la plus proche de fermer d'abord. Celles attribuées à un autre
 * membre ne s'affichent pas chez moi.
 */
export async function messagesEnAttente(moi: string | null, limite = 8): Promise<MessageEnAttente[]> {
  const rows = await db.execute<{ lead_id: string; nom: string; apercu: string | null; recu: string; assigned_to: string | null }>(sql`
    with derniers as (
      select distinct on (numero_complet(l.mobile_no))
             numero_complet(l.mobile_no) as tel, a.direction, a.content, a.created_at
      from activities a join leads l on l.id = a.reference_id
      where a.type = 'whatsapp' and a.reference_type = 'lead'
        and a.created_at > now() - interval '24 hours'
        and numero_complet(l.mobile_no) <> ''
      order by numero_complet(l.mobile_no), a.created_at desc
    )
    select p.id as lead_id, p.full_name as nom, d.content as apercu, d.created_at::text as recu, c.assigned_to
    from derniers d
    join lateral (
      select id, full_name from leads where numero_complet(mobile_no) = d.tel order by created_at desc limit 1
    ) p on true
    left join whatsapp_conversations c on c.lead_id = p.id
    where d.direction = 'inbound' and c.archived_at is null
      and (c.assigned_to is null or lower(c.assigned_to) = lower(${moi ?? ""}))
    order by d.created_at asc
    limit ${limite}`);
  return rows.map((r) => ({
    leadId: r.lead_id,
    nom: r.nom,
    apercu: r.apercu,
    recuLe: r.recu,
    heuresRestantes: Math.max(0, 24 - (Date.now() - new Date(r.recu.replace(" ", "T") + "Z").getTime()) / 3_600_000),
    suiviPar: r.assigned_to,
  }));
}

export type PropositionAFaire = { leadId: string; nom: string; question: string; draft: string; score: number; decision: string };

/** Les propositions de l'assistant des dernières 24 h, sans envoi ni réponse humaine depuis. */
export async function propositionsEnAttente(limite = 6): Promise<PropositionAFaire[]> {
  const rows = await db.execute<{ lead_id: string; nom: string; question: string; draft: string; score: number; decision: string }>(sql`
    select distinct on (r.lead_id) r.lead_id, l.full_name as nom, r.question, r.draft, r.score, r.decision
    from ai_replies r join leads l on l.id = r.lead_id
    where r.created_at > now() - interval '24 hours'
      and r.sent_text is null and r.decision in ('pret', 'escalade', 'formulaire') and coalesce(r.draft, '') <> ''
      and not exists (
        select 1 from activities a join leads x on x.id = a.reference_id
        where a.type = 'whatsapp' and a.direction = 'outbound' and a.created_at > r.created_at
          and numero_complet(x.mobile_no) = numero_complet(l.mobile_no))
    order by r.lead_id, r.created_at desc
    limit ${limite}`);
  return rows.map((r) => ({ leadId: r.lead_id, nom: r.nom, question: r.question, draft: r.draft, score: r.score, decision: r.decision }));
}

export type TacheDuJour = { id: string; titre: string; echeance: string | null; priorite: string; leadId: string | null; enRetard: boolean };

/** Les tâches ouvertes dues aujourd'hui ou en retard (heure locale), à moi ou à personne. */
export async function tachesDuJour(moi: string | null, limite = 8): Promise<TacheDuJour[]> {
  const rows = await db.execute<{ id: string; title: string; due: string | null; priority: string; reference_id: string | null; reference_type: string | null; retard: boolean }>(sql`
    select t.id, t.title, t.due_date::text as due, t.priority::text as priority, t.reference_id, t.reference_type::text as reference_type,
           (t.due_date at time zone 'UTC' at time zone ${APP_TIMEZONE})::date < (now() at time zone ${APP_TIMEZONE})::date as retard
    from tasks t
    where t.status in ('backlog', 'todo', 'in_progress') and t.due_date is not null
      and (t.due_date at time zone 'UTC' at time zone ${APP_TIMEZONE})::date <= (now() at time zone ${APP_TIMEZONE})::date
      and (t.assigned_to is null or lower(t.assigned_to) = lower(${moi ?? ""}))
    order by (t.priority = 'high') desc, t.due_date asc
    limit ${limite}`);
  return rows.map((r) => ({
    id: r.id,
    titre: r.title,
    echeance: r.due,
    priorite: r.priority,
    leadId: r.reference_type === "lead" ? r.reference_id : null,
    enRetard: r.retard,
  }));
}
