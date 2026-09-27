import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leadSources, whatsappLinks } from "@/db/schema";

/*
 * Liens WhatsApp de suivi (27/09) : un lien par source — bio Instagram, flyer,
 * salon, partenaire. Le message pré-rempli finit par un code entre parenthèses
 * (« … 👋 (IG1) ») ; quand un NOUVEAU lead écrit avec ce code, il est rangé
 * dans la source « WhatsApp — <nom du lien> », que Analytics compte déjà.
 */

export type LienSuivi = typeof whatsappLinks.$inferSelect;

const MOTIF = /\(([A-Z0-9]{2,8})\)\s*$/;

/** Le lien dont le code termine ce message, s'il existe. */
export async function lienDuMessage(texte: string) {
  const code = texte.trim().match(MOTIF)?.[1];
  if (!code) return null;
  return (await db.query.whatsappLinks.findFirst({ where: eq(whatsappLinks.code, code) })) ?? null;
}

function codeDepuis(nom: string) {
  const lettres = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  return lettres.length >= 2 ? lettres : "WA";
}

export async function creerLien(input: { nom: string; message: string; auteur: string | null }) {
  const nom = input.nom.trim().slice(0, 60);
  const message = input.message.trim().replace(MOTIF, "").trim().slice(0, 300);
  if (!nom || !message) return { ok: false as const, error: "Un nom et un message, s'il vous plaît." };
  // Code court et unique : lettres du nom + numéro.
  const base = codeDepuis(nom);
  let code = base;
  for (let i = 1; await db.query.whatsappLinks.findFirst({ where: eq(whatsappLinks.code, code) }); i++) code = `${base}${i}`;
  const nomSource = `WhatsApp — ${nom}`;
  const source =
    (await db.query.leadSources.findFirst({ where: eq(leadSources.name, nomSource) })) ??
    (await db.insert(leadSources).values({ name: nomSource }).returning())[0];
  await db.insert(whatsappLinks).values({ nom, code, message, sourceId: source.id, createdBy: input.auteur });
  return { ok: true as const };
}

export async function supprimerLien(id: string) {
  await db.delete(whatsappLinks).where(eq(whatsappLinks.id, id));
}

/** Les liens, avec le nombre de leads et d'inscrits arrivés par chacun. */
export async function listerLiens() {
  const liens = await db.query.whatsappLinks.findMany({ orderBy: [desc(whatsappLinks.createdAt)] });
  const stats = await db.execute<{ source_id: string; leads: number; inscrits: number }>(sql`
    select l.source_id, count(*)::int as leads, count(*) filter (where s.kind = 'converted' or l.converted)::int as inscrits
    from leads l left join lead_statuses s on s.id = l.status_id
    where l.source_id in (select source_id from whatsapp_links where source_id is not null)
    group by l.source_id`);
  const parSource = new Map(stats.map((s) => [s.source_id, s]));
  return liens.map((l) => ({ ...l, leads: parSource.get(l.sourceId ?? "")?.leads ?? 0, inscrits: parSource.get(l.sourceId ?? "")?.inscrits ?? 0 }));
}
