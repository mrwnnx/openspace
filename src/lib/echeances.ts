import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Toutes les échéances des inscrits, avec leur état et le dernier rappel parti. */
export type LigneEcheance = {
  id: string;
  leadId: string;
  nom: string;
  formationId: string | null;
  formation: string | null;
  rang: number;
  total: number;
  montant: number;
  due: string | null;
  payee: boolean;
  payeeLe: string | null;
  sansRappel: boolean;
  dernierRappel: string | null;
  dernierRappelResultat: string | null;
};

export async function getEcheances(formationId?: string | null): Promise<LigneEcheance[]> {
  const rows = await db.execute<{
    id: string; lead_id: string; nom: string; formation_id: string | null; formation: string | null;
    rang: number; total: number; montant: string | null; due: string | null; is_paid: boolean; paid_at: string | null;
    no_payment_reminder: boolean; dernier_rappel: string | null; resultat: string | null;
  }>(sql`
    select p.id, l.id as lead_id, l.full_name as nom, b.id as formation_id, b.name as formation,
           (row_number() over (partition by p.lead_id order by p.due_date nulls last, p.created_at))::int as rang,
           (count(*) over (partition by p.lead_id))::int as total,
           p.amount::text as montant, p.due_date::text as due, p.is_paid, p.paid_at::text,
           l.no_payment_reminder,
           r.sent_at::text as dernier_rappel, r.result as resultat
    from payment_schedules p
    join leads l on l.id = p.lead_id
    left join bootcamps b on b.id = l.bootcamp_id
    left join lateral (
      select sent_at, result from payment_reminders x where x.schedule_id = p.id order by sent_at desc limit 1
    ) r on true
    where ${formationId ? sql`l.bootcamp_id = ${formationId}` : sql`true`}
    order by p.due_date nulls last, l.full_name`);
  return rows.map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    nom: r.nom,
    formationId: r.formation_id,
    formation: r.formation,
    rang: r.rang,
    total: r.total,
    montant: Number(r.montant ?? 0),
    due: r.due,
    payee: r.is_paid,
    payeeLe: r.paid_at,
    sansRappel: r.no_payment_reminder,
    dernierRappel: r.dernier_rappel,
    dernierRappelResultat: r.resultat,
  }));
}
