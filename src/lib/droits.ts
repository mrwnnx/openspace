import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { allowedEmails } from "@/db/schema";
import { currentActor } from "@/lib/auth";
import {
  AUCUN_DROIT,
  DOMAINE_INFO,
  RANG,
  TOUT_GERER,
  accueilPour,
  normaliser,
  type Domaine,
  type Niveau,
  type Niveaux,
} from "@/lib/droits-domaines";

export type Droits = { email: string | null; proprietaire: boolean; niveaux: Niveaux };

/**
 * Les droits d'une adresse, lus dans `allowed_emails`. Une adresse absente
 * de la liste d'équipe n'a AUCUN droit. Le propriétaire est la ligne
 * `role = 'proprietaire'` (le premier compte, cf. premier-compte.ts).
 * Mémoïsé par requête.
 */
export const droitsDe = cache(async (email: string | null): Promise<Droits> => {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return { email: null, proprietaire: false, niveaux: AUCUN_DROIT };
  const row = await db.query.allowedEmails.findFirst({
    where: sql`lower(${allowedEmails.email}) = ${e}`,
  });
  const proprietaire = row?.role === "proprietaire";
  if (proprietaire) return { email: e, proprietaire: true, niveaux: TOUT_GERER };
  return { email: e, proprietaire: false, niveaux: row ? normaliser(row.permissions) : AUCUN_DROIT };
});

/** Les droits du compte connecté (jeton de session). */
export const mesDroits = cache(async (): Promise<Droits> => droitsDe(await currentActor()));

export function a(d: Droits, domaine: Domaine, niveau: Niveau): boolean {
  return RANG[d.niveaux[domaine]] >= RANG[niveau];
}

export async function peut(domaine: Domaine, niveau: Niveau): Promise<boolean> {
  return a(await mesDroits(), domaine, niveau);
}

/**
 * La vraie protection : en tête de chaque server action, APRÈS requireUser().
 * Lève une erreur lisible si le compte connecté n'a pas le niveau demandé.
 */
export async function exiger(domaine: Domaine, niveau: Niveau): Promise<Droits> {
  const d = await mesDroits();
  if (!a(d, domaine, niveau)) {
    const verbe = niveau === "gerer" ? "modifier" : "voir";
    throw new Error(`Vous n'avez pas le droit de ${verbe} ${DOMAINE_INFO[domaine].objet}.`);
  }
  return d;
}

/** Gestion de l'équipe : les propriétaires seulement. */
export async function exigerProprietaire(): Promise<Droits> {
  const d = await mesDroits();
  if (!d.proprietaire) throw new Error("Seul un propriétaire peut gérer l'équipe.");
  return d;
}

// ── Argent : ce qui ne doit même pas partir vers le navigateur ──

const CLES_MONTANT = ["priceTotal", "monthlyAmount", "offerTotal", "offerMonthlyAmount"] as const;

/** Copie de l'objet (formation, lead) avec ses montants à null. */
export function sansMontants<T>(o: T): T {
  if (!o || typeof o !== "object") return o;
  const c: Record<string, unknown> = { ...(o as Record<string, unknown>) };
  for (const k of CLES_MONTANT) if (k in c) c[k] = null;
  return c as T;
}

/** Les notes du fil qui portent un montant (écrites par setLeadOfferAction et
 *  updateEcheanceAmountAction). */
const SUJETS_ARGENT = ["Offre modifiée", "Montant d'une échéance corrigé"];

/** Une activité du fil qui porte un montant (notes d'offre, rappels d'échéance). */
export function porteUnMontant(x: { subject: string | null }): boolean {
  return !!x.subject && (SUJETS_ARGENT.includes(x.subject) || x.subject.startsWith("Rappel d'échéance"));
}

/** Pour les pages : sans le droit, retour à la première page permise. */
export async function exigerPage(domaine: Domaine, niveau: Niveau = "voir"): Promise<Droits> {
  const d = await mesDroits();
  if (!a(d, domaine, niveau)) redirect(accueilPour(d.niveaux));
  return d;
}

/** Page ouverte si AU MOINS un des domaines est permis (ex. la page formation). */
export async function exigerPageUnDe(domaines: Domaine[], niveau: Niveau = "voir"): Promise<Droits> {
  const d = await mesDroits();
  if (!domaines.some((x) => a(d, x, niveau))) redirect(accueilPour(d.niveaux));
  return d;
}
