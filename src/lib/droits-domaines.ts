// Droits par membre — les constantes, sans rien côté serveur : l'écran Équipe
// (composant client) les importe aussi. La vérification vit dans droits.ts.

export const DOMAINES = [
  "leads",
  "formations",
  "argent",
  "stats",
  "whatsapp",
  "campagnes",
  "contacts",
  "reglages",
] as const;
export type Domaine = (typeof DOMAINES)[number];

export type Niveau = "aucun" | "voir" | "gerer";
export type Niveaux = Record<Domaine, Niveau>;

export const RANG: Record<Niveau, number> = { aucun: 0, voir: 1, gerer: 2 };

/** Libellé (écran Équipe) et complément des messages de refus. */
export const DOMAINE_INFO: Record<Domaine, { label: string; detail: string; objet: string; niveaux: Niveau[] }> = {
  leads: {
    label: "Leads & pipeline",
    detail: "Kanban, fiches, déplacer un lead, appels, tâches, notes, tags, Aujourd'hui",
    objet: "les leads",
    niveaux: ["aucun", "voir", "gerer"],
  },
  formations: {
    label: "Formations",
    detail: "Créer, modifier, dupliquer, archiver ; colonnes, prix catalogue, automatisations, formulaires",
    objet: "les formations",
    niveaux: ["aucun", "voir", "gerer"],
  },
  argent: {
    label: "Argent",
    detail: "Prix, offres, échéances, encaissements, inscriptions, chiffre d'affaires",
    objet: "les montants",
    niveaux: ["aucun", "voir", "gerer"],
  },
  stats: {
    label: "Statistiques",
    detail: "Dashboard, Analytics, statistiques des formations",
    objet: "les statistiques",
    niveaux: ["aucun", "voir"],
  },
  whatsapp: {
    label: "WhatsApp",
    detail: "Voir les conversations ; gérer = répondre, modèles, médias, notes, attribuer",
    objet: "WhatsApp",
    niveaux: ["aucun", "voir", "gerer"],
  },
  campagnes: {
    label: "Campagnes",
    detail: "Campagnes email, envois WhatsApp en masse, envois de colonne",
    objet: "les campagnes",
    niveaux: ["aucun", "voir", "gerer"],
  },
  contacts: {
    label: "Contacts & import",
    detail: "Contacts, import CSV",
    objet: "les contacts",
    niveaux: ["aucun", "voir", "gerer"],
  },
  reglages: {
    label: "Réglages",
    detail: "Paramètres, modèles WhatsApp, assistant IA, codes promo, connexion site, habillage email",
    objet: "les réglages",
    niveaux: ["aucun", "gerer"],
  },
};

export const NIVEAU_LABEL: Record<Niveau, string> = { aucun: "Aucun", voir: "Voir", gerer: "Gérer" };

export const TOUT_GERER: Niveaux = {
  leads: "gerer",
  formations: "gerer",
  argent: "gerer",
  stats: "voir",
  whatsapp: "gerer",
  campagnes: "gerer",
  contacts: "gerer",
  reglages: "gerer",
};

export const AUCUN_DROIT: Niveaux = {
  leads: "aucun",
  formations: "aucun",
  argent: "aucun",
  stats: "aucun",
  whatsapp: "aucun",
  campagnes: "aucun",
  contacts: "aucun",
  reglages: "aucun",
};

/** Un membre qu'on invite, avant que le propriétaire ajuste. */
export const DEFAUT_INVITATION: Niveaux = {
  ...AUCUN_DROIT,
  leads: "gerer",
  whatsapp: "gerer",
  formations: "voir",
  contacts: "voir",
};

/**
 * Le jsonb tel qu'il est stocké → un niveau valide par domaine. Une clé absente
 * vaut "aucun" ; un niveau que le domaine n'offre pas est ramené au plus haut
 * niveau offert en dessous (stats "gerer" → "voir", réglages "voir" → "aucun").
 */
export function normaliser(brut: unknown): Niveaux {
  const src = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const out = { ...AUCUN_DROIT };
  for (const d of DOMAINES) {
    const v = src[d];
    if (v !== "aucun" && v !== "voir" && v !== "gerer") continue;
    const possibles = DOMAINE_INFO[d].niveaux.filter((n) => RANG[n] <= RANG[v]);
    out[d] = possibles[possibles.length - 1] ?? "aucun";
  }
  return out;
}

/** La première page qu'un membre a le droit d'ouvrir. */
export function accueilPour(n: Niveaux): string {
  if (RANG[n.leads] >= 1) return "/aujourdhui"; // « Ma journée » est l'accueil (27/09)
  if (RANG[n.whatsapp] >= 1) return "/whatsapp";
  if (RANG[n.formations] >= 1) return "/bootcamps";
  if (RANG[n.stats] >= 1) return "/analytics";
  if (RANG[n.campagnes] >= 1) return "/campaigns";
  if (RANG[n.contacts] >= 1) return "/contacts";
  if (RANG[n.argent] >= 1) return "/echeances";
  if (RANG[n.reglages] >= 2) return "/settings";
  return "/settings?tab=profile";
}
