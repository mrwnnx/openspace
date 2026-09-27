import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Comparer un secret reçu à l'attendu en temps constant : un
 * `!==` s'arrête au premier caractère faux, ce qui laisse mesurer la réponse.
 * Les deux côtés sont hachés d'abord : même longueur, quelle que soit l'entrée.
 */
export function secretEgal(recu: string | null | undefined, attendu: string): boolean {
  const a = createHash("sha256").update(String(recu ?? "")).digest();
  const b = createHash("sha256").update(attendu).digest();
  return timingSafeEqual(a, b) && recu != null;
}
