import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { signerMedias } from "@/lib/messaging/whatsapp-media";
import { signedProofUrl } from "@/lib/payment-proof";

/*
 * « Médias, liens et documents » d'un lead, comme l'écran du même nom dans
 * WhatsApp : tout ce qui a été échangé avec ce NUMÉRO (toutes ses fiches), plus
 * les justificatifs de paiement. Les fichiers sont privés : URL signées à la
 * demande, lues seulement quand on ouvre la vue.
 */

export type ElementMedia = {
  kind: "image" | "video" | "audio" | "document" | "sticker" | "justificatif";
  url: string;
  nom: string | null;
  sens: "inbound" | "outbound";
  date: string;
};
export type Lien = { url: string; sens: "inbound" | "outbound"; date: string };

export async function mediasDuLead(leadId: string) {
  const fiches = sql`(
    select id from leads where id = ${leadId}
    union
    select l.id from leads l, leads moi
    where moi.id = ${leadId}
      and numero_complet(moi.mobile_no) <> ''
      and numero_complet(l.mobile_no) = numero_complet(moi.mobile_no)
  )`;

  const [fichiers, messages, preuves] = await Promise.all([
    db.execute<{ kind: string; storage_path: string; filename: string | null; direction: string; at: string }>(sql`
      select m.kind, m.storage_path, m.filename, a.direction, a.created_at::text as at
      from whatsapp_media m join activities a on a.id = m.activity_id
      where a.reference_id in ${fiches}
      order by a.created_at desc limit 300`),
    db.execute<{ content: string; direction: string; at: string }>(sql`
      select a.content, a.direction, a.created_at::text as at from activities a
      where a.reference_id in ${fiches} and a.type = 'whatsapp' and a.content ~ 'https?://'
      order by a.created_at desc limit 300`),
    db.execute<{ proof_path: string; proof_name: string | null; at: string }>(sql`
      select proof_path, proof_name, coalesce(proof_uploaded_at, paid_at, created_at)::text as at
      from payment_schedules where lead_id in ${fiches} and proof_path is not null
      order by 3 desc`),
  ]);

  const signees = await signerMedias(fichiers.map((f) => f.storage_path));
  const medias: ElementMedia[] = fichiers
    .map((f) => ({
      kind: f.kind as ElementMedia["kind"],
      url: signees.get(f.storage_path) ?? "",
      nom: f.filename,
      sens: f.direction as ElementMedia["sens"],
      date: f.at,
    }))
    .filter((m) => m.url);

  const justificatifs: ElementMedia[] = [];
  for (const p of preuves) {
    const url = await signedProofUrl(p.proof_path);
    if (url) justificatifs.push({ kind: "justificatif", url, nom: p.proof_name ?? "Justificatif de paiement", sens: "inbound", date: p.at });
  }

  const vus = new Set<string>();
  const liens: Lien[] = [];
  for (const m of messages) {
    for (const brut of m.content.match(/https?:\/\/[^\s<>"'«»]+/g) ?? []) {
      const url = brut.replace(/[.,;:!?)\]]+$/, "");
      if (vus.has(url)) continue;
      vus.add(url);
      liens.push({ url, sens: m.direction as Lien["sens"], date: m.at });
    }
  }

  return { medias, justificatifs, liens };
}
