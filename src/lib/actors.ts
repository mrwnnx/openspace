/**
 * Qui a fait quoi — la traduction d'un identifiant d'auteur en nom lisible.
 * Module neutre (ni client, ni serveur) : lu par les requêtes et par l'écran.
 * Les humains sont identifiés par leur email ; leur nom affiché vient des
 * profils (team-profiles). Ici, seulement les auteurs automatiques.
 */
export const AUTEURS_AUTO = ["webhook", "automation"] as const;

export function actorName(raw: string | null): string {
  if (!raw) return "Auteur inconnu";
  if (raw === "webhook") return "Import";
  if (raw === "automation") return "Automatisation";
  if (raw === "assistant") return "Assistant";
  // Une adresse inconnue reste lisible : on montre ce qu'il y a avant l'arobase.
  return raw.split("@")[0];
}
