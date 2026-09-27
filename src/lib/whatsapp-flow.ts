import "server-only";
import { db } from "@/db";
import { contacts, leads } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendWhatsApp } from "@/lib/messaging/whatsapp";
import { carryLeadsOver, createActivity, getLeadById, moveLeadToStage, updateLead } from "@/lib/queries";
import { recordWhatsAppSent } from "@/lib/whatsapp-inbox";
import { codeValable, prixAvecCode } from "@/lib/promo";

/*
 * Le formulaire WhatsApp d'inscription (un Meta Flow ; exemple prêt à publier
 * dans docs/whatsapp-flow-exemple.json, identifiant dans WHATSAPP_FLOW_INSCRIPTION_ID).
 *
 * À l'envoi : chaque personne reçoit ce qu'on sait déjà d'elle — le formulaire
 * n'affiche que les champs manquants, ou un simple « Confirmer » s'il ne manque
 * rien.
 * Au retour : fiche complétée, report vers la formation active (colonne
 * Intéressé), remerciement.
 */

// Le jeton qui revient avec la réponse : c'est lui qui dit de quelle fiche il s'agit.
const PREFIXE = "inscr:";

// Le formulaire publié chez Meta (non modifiable : un changement = un nouveau
// formulaire, donc un nouvel identifiant). Sans lui, l'assistant répond en texte.
export { WHATSAPP_FLOW_INSCRIPTION_ID as FLOW_INSCRIPTION_ID } from "@/lib/config";

// Les choix de la question « situation » : identiques à ceux du formulaire publié.
const SITUATIONS = ["Salarié·e", "Étudiant·e", "Sans emploi", "Freelance", "Autre"];

/** Le nom du formulaire, dans le fil et le journal. */
const NOM_FORMULAIRE = "Formulaire WhatsApp d'inscription";

export async function donneesFlowInscription(
  leadId: string | null | undefined,
  // La session visée, choisie à l'envoi ; à défaut, celle qui reçoit les formulaires du site.
  formationId?: string | null
) {
  const lead = leadId ? await getLeadById(leadId) : null;
  const formation = formationId ?? (await formationActive())?.id ?? null;
  const need_age = lead?.contact?.age == null;
  const need_situation = !lead?.jobTitle?.trim();
  const need_plan = !lead?.intendedPlan;
  const need_email = !lead?.email?.trim() && !lead?.contact?.email?.trim();
  const rien = !need_age && !need_situation && !need_plan && !need_email;
  const formules = await formulesAvecPrix(formation, lead?.promoCodeId);
  return {
    token: lead ? `${PREFIXE}${lead.id}${formationId ? `:${formationId}` : ""}` : "unused",
    data: {
      intro: rien
        ? "Nous avons toutes vos informations ✅ Appuyez sur « Confirmer l'inscription », nous vous rappelons très vite."
        : "Complétez ces informations pour votre inscription à la prochaine session 👇",
      need_age,
      need_situation,
      need_plan,
      need_email,
      formules,
    },
  };
}

/**
 * Le code qui fixe les prix du formulaire : celui que la personne a tapé, s'il
 * vaut pour cette session. Sans code, prix normal.
 */
async function codePourFlow(promoCodeId: string | null | undefined, formationId: string | null) {
  if (!promoCodeId) return null;
  const codes = await db.query.promoCodes.findMany();
  const sien = codes.find((c) => c.id === promoCodeId);
  return sien && codeValable(sien, formationId) ? sien : null;
}

/**
 * Les deux formules avec le prix de la session visée, remise déjà faite, et
 * le prix normal en petit : le prix se lit au moment de choisir, pas après.
 */
async function formulesAvecPrix(formationId: string | null, promoCodeId?: string | null) {
  const [b] = formationId
    ? await db.execute<{ price_total: string | null; monthly_count: number | null; monthly_amount: string | null; currency: string }>(sql`
        select price_total::text, monthly_count, monthly_amount::text, currency from bootcamps where id = ${formationId}`)
    : [];
  const devise = b?.currency || "";
  const normal = (v: string) => String(Number(v));
  const code = b ? await codePourFlow(promoCodeId, formationId) : null;
  const prix = code && b ? prixAvecCode({ priceTotal: b.price_total, monthlyCount: b.monthly_count, monthlyAmount: b.monthly_amount }, code) : null;
  const pct = (v: string | null) => String(Number(v));
  return [
    b?.price_total
      ? prix?.total != null
        ? { id: "total", title: `En une fois — ${prix.total} ${devise}`, description: `au lieu de ${normal(b.price_total)} ${devise}, remise de ${pct(code!.remiseTotalPct)} %` }
        : { id: "total", title: `En une fois — ${normal(b.price_total)} ${devise}` }
      : { id: "total", title: "En une fois" },
    // La remise « facilité » n'existe que si le code la prévoit.
    b?.monthly_count && b.monthly_amount
      ? prix?.mensualite != null
        ? {
            id: "monthly",
            title: `En ${b.monthly_count} fois — ${b.monthly_count} × ${prix.mensualite} ${devise}`,
            description: `au lieu de ${b.monthly_count} × ${normal(b.monthly_amount)} ${devise}, remise de ${pct(code!.remiseFacilitePct)} %`,
          }
        : { id: "monthly", title: `En ${b.monthly_count} fois — ${b.monthly_count} × ${normal(b.monthly_amount)} ${devise}` }
      : { id: "monthly", title: "En plusieurs fois (chaque mois)" },
  ];
}

/**
 * La formation où arrivent aujourd'hui les nouvelles inscriptions : celle qui
 * reçoit les formulaires du site. Après une duplication, elle suit toute seule.
 */
export async function formationActive() {
  const [b] = await db.execute<{ id: string; name: string }>(sql`
    select b.id, b.name from bootcamps b
    where b.archived_at is null and b.status not in ('completed', 'cancelled')
      and exists (select 1 from form_sources f where f.bootcamp_id = b.id and f.active)
    order by b.start_date desc nulls last, b.created_at desc
    limit 1`);
  return b ?? null;
}

async function colonneInteresse(bootcampId: string) {
  const [s] = await db.execute<{ id: string }>(sql`
    select id from lead_statuses where bootcamp_id = ${bootcampId} and kind = 'normal'
    order by (name ilike 'intéress%') desc, position asc limit 1`);
  return s?.id ?? null;
}

async function formationParId(id: string) {
  const [b] = await db.execute<{ id: string; name: string }>(sql`select id, name from bootcamps where id = ${id}`);
  return b ?? null;
}

/** La fiche que cette personne a déjà dans cette formation (même contact ou même email). */
async function ficheDansFormation(leadId: string, bootcampId: string) {
  const [f] = await db.execute<{ id: string }>(sql`
    select t.id from leads t, leads o
    where o.id = ${leadId} and t.bootcamp_id = ${bootcampId}
      and ((o.contact_id is not null and t.contact_id = o.contact_id)
        or (coalesce(o.email, '') <> '' and lower(trim(t.email)) = lower(trim(o.email))))
    order by t.created_at desc limit 1`);
  return f?.id ?? null;
}

/** En Intéressé, sauf si déjà inscrite (on ne fait jamais reculer une inscription). */
async function passerEnInteresse(leadId: string, colonne: string) {
  const [l] = await db.execute<{ status_id: string | null; kind: string | null }>(sql`
    select l.status_id, s.kind::text as kind from leads l left join lead_statuses s on s.id = l.status_id where l.id = ${leadId}`);
  if (!l || l.status_id === colonne || l.kind === "converted") return;
  // Déjà plus loin (Contacté, Payment pending…) : le formulaire ne fait pas reculer.
  const { dejaPlusLoin } = await import("@/lib/pipeline-whatsapp");
  if (await dejaPlusLoin(leadId, colonne)) return;
  await moveLeadToStage(leadId, colonne);
  const { runStatusAutomations } = await import("@/lib/automations");
  await runStatusAutomations(leadId, colonne);
}

/** Réponse du formulaire (webhook `nfm_reply`). Ne jette jamais : un échec ne doit pas bloquer le webhook. */
export async function traiterReponseFlow(input: { responseJson: string; leadIdRecu: string | null }) {
  try {
    const r = JSON.parse(input.responseJson) as Record<string, unknown>;
    // Jeton : « inscr:<lead> » ou « inscr:<lead>:<formation choisie à l'envoi> ».
    const token = String(r.flow_token ?? "");
    const [leadIdJeton, formationJeton] = token.startsWith(PREFIXE) ? token.slice(PREFIXE.length).split(":") : [];
    const leadId = leadIdJeton || input.leadIdRecu;
    const lead = leadId ? await getLeadById(leadId) : null;
    if (!lead) return;

    // Ce que la personne vient de répondre REMPLACE l'ancien.
    // Un champ caché revient vide : il ne touche à rien.
    const age = Number(String(r.age ?? "").trim());
    const situation = String(r.situation ?? "").trim();
    const formule = String(r.formule ?? "").trim();
    const recu: string[] = [];
    if (Number.isInteger(age) && age >= 10 && age <= 99 && lead.contactId) {
      await db.update(contacts).set({ age }).where(eq(contacts.id, lead.contactId));
      recu.push(`âge ${age}`);
    }
    const maj: Partial<typeof leads.$inferInsert> = {};
    if (SITUATIONS.includes(situation)) {
      maj.jobTitle = situation;
      recu.push(`situation « ${situation} »`);
    }
    if (formule === "total" || formule === "monthly") {
      maj.intendedPlan = formule;
      recu.push(formule === "total" ? "paiement en une fois" : "paiement mensuel");
    }
    const email = String(r.email ?? "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      maj.email = email;
      recu.push(`email ${email}`);
      if (lead.contactId) {
        await db.update(contacts).set({ email }).where(and(eq(contacts.id, lead.contactId), sql`coalesce(trim(${contacts.email}), '') = ''`));
      }
    }
    if (Object.keys(maj).length > 0) await updateLead(lead.id, maj);

    // Elle a rempli le formulaire depuis WhatsApp : elle accepte d'y être contactée.
    if (lead.contactId) {
      await db
        .update(contacts)
        .set({ whatsappConsentAt: new Date(), whatsappConsentSource: NOM_FORMULAIRE })
        .where(and(eq(contacts.id, lead.contactId), sql`${contacts.whatsappConsentAt} is null`, sql`${contacts.whatsappUnsubscribedAt} is null`));
    }

    // La fiche de la session visée, colonne Intéressé : reportée, déjà là, ou elle-même.
    const cible = formationJeton ? await formationParId(formationJeton) : await formationActive();
    let fiche = lead.id;
    let destination = "";
    if (cible) {
      const colonne = await colonneInteresse(cible.id);
      if (cible.id === lead.bootcampId) {
        fiche = lead.id;
      } else {
        // Report en 1ʳᵉ colonne, puis VRAI déplacement vers Intéressé : c'est lui
        // qui déclenche les envois et tags de la colonne (le report n'en lance aucun).
        const [nouveau] = await carryLeadsOver([lead.id], cible.id, "whatsapp");
        fiche = nouveau ?? (await ficheDansFormation(lead.id, cible.id)) ?? lead.id;
        if (nouveau) destination = cible.name;
      }
      if (fiche !== lead.id) {
        // La fiche d'arrivée porte aussi les réponses ; la formule, le report ne la recopie pas.
        const plan = maj.intendedPlan ?? lead.intendedPlan;
        await updateLead(fiche, { ...maj, ...(plan ? { intendedPlan: plan } : {}) });
      }
      if (colonne) await passerEnInteresse(fiche, colonne);
    }

    await createActivity({
      referenceType: "lead",
      referenceId: fiche,
      type: "note",
      direction: "inbound",
      subject: `${NOM_FORMULAIRE} rempli`,
      content: [
        destination ? `Inscrite pour « ${destination} » depuis WhatsApp.` : "Confirmation d'intérêt depuis WhatsApp.",
        recu.length ? `Complété : ${recu.join(", ")}.` : "Aucune information manquante.",
      ].join("\n"),
      createdBy: "whatsapp",
    });

    if (lead.mobileNo) {
      const corps = "Merci ✅ Nous avons bien reçu vos informations, nous vous rappelons très vite pour finaliser l'inscription 🙏";
      const envoi = await sendWhatsApp({ to: lead.mobileNo, body: corps });
      if (envoi.ok) {
        const activite = await createActivity({
          referenceType: "lead",
          referenceId: fiche,
          type: "whatsapp",
          direction: "outbound",
          subject: `Réponse automatique au ${NOM_FORMULAIRE.charAt(0).toLowerCase()}${NOM_FORMULAIRE.slice(1)}`,
          content: corps,
          createdBy: "automation",
        });
        if (envoi.sid) await recordWhatsAppSent(envoi.sid, activite.id);
      } else {
        console.error("Formulaire WhatsApp — remerciement non envoyé :", envoi.error);
      }
    }
  } catch (e) {
    console.error("Formulaire WhatsApp :", e);
  }
}
