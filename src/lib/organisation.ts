import "server-only";
import { db } from "@/db";

export type Organisation = {
  nom: string;
  description: string;
  langue: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
};

const VIDE: Organisation = { nom: "", description: "", langue: "", adresse: "", latitude: null, longitude: null };

/** Jamais null : une installation neuve lit une école vide. */
export async function getOrganisation(): Promise<Organisation> {
  const row = await db.query.organisation.findFirst();
  if (!row) return VIDE;
  const { nom, description, langue, adresse, latitude, longitude } = row;
  return { nom, description, langue, adresse, latitude, longitude };
}

/** « Mon école (description) » ; sans réglage : « une école de formation ». */
export function presentation(o: Organisation): string {
  const nom = o.nom.trim();
  const desc = o.description.trim();
  if (!nom && !desc) return "une école de formation";
  if (!nom) return `une école de formation (${desc})`;
  return desc ? `${nom} (${desc})` : nom;
}

export function consigneLangue(o: Organisation): string {
  const l = o.langue.trim();
  return l
    ? `Langue de l'école : ${l}. Si la personne écrit dans une autre langue, réponds dans la sienne.`
    : "Réponds dans la langue du message reçu.";
}
