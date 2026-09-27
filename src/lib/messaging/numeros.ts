/**
 * Les numéros de téléphone, sans dépendance (lu par le serveur et par les
 * scripts). Règle unique, la même que la fonction SQL numero_complet :
 * chiffres seuls, « 00 » de tête retiré, un numéro national
 * (NATIONAL_NUMBER_LENGTH chiffres) reçoit l'indicatif DEFAULT_COUNTRY_CODE.
 */
import { DEFAULT_COUNTRY_CODE, NATIONAL_NUMBER_LENGTH } from "@/lib/config";

/**
 * Chiffres seuls → numéro complet si c'est un numéro national, sinon inchangé.
 * Un numéro national tapé avec son 0 de tête (« 06 12 34 56 78 » en France)
 * perd ce 0 avant de recevoir l'indicatif.
 */
export function avecIndicatif(chiffres: string): string {
  if (chiffres.length === NATIONAL_NUMBER_LENGTH) return `${DEFAULT_COUNTRY_CODE}${chiffres}`;
  if (chiffres.length === NATIONAL_NUMBER_LENGTH + 1 && chiffres.startsWith("0") && !chiffres.startsWith("00")) {
    return `${DEFAULT_COUNTRY_CODE}${chiffres.slice(1)}`;
  }
  return chiffres;
}

/**
 * Le numéro COMPLET, clé d'une personne : comparer seulement les derniers
 * chiffres confondrait un numéro étranger et un numéro national.
 */
export function numeroComplet(brut: string | null | undefined): string {
  const d = String(brut ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  return avecIndicatif(d);
}

/** Le numéro tel que Meta l'attend : chiffres seuls, indicatif compris. */
export function normaliserNumero(brut: string): string {
  // Chiffres arabes (٠١٢…) ou persans (۰۱۲…) saisis au téléphone : ce sont
  // des chiffres comme les autres.
  const latins = brut.replace(/[٠-٩۰-۹]/g, (c) => String((c.charCodeAt(0) & 0xf) % 10));
  const chiffres = latins.replace(/\D/g, "");
  // Un numéro étranger saisi avec le préfixe « 00 » : Meta attend l'indicatif seul.
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  // Un numéro national saisi sans indicatif : sans lui, Meta ne livre rien.
  return avecIndicatif(chiffres);
}
