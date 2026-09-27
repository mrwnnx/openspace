"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { exiger } from "@/lib/droits";
import { db } from "@/db";
import { leads, whatsappSettings } from "@/db/schema";

/** Rappels d'échéance : interrupteur et moments (en jours, -3 = 3 jours avant). */
export async function reglerRappelsAction(actif: boolean, moments: number[]) {
  await requireUser();
  await exiger("argent", "gerer");
  const { MOMENTS_POSSIBLES } = await import("@/lib/rappels-echeances");
  const propres = [...new Set(moments)].filter((m) => MOMENTS_POSSIBLES.includes(m)).sort((a, b) => a - b);
  const { getWhatsAppSettings } = await import("@/lib/whatsapp-settings");
  await getWhatsAppSettings(); // garantit la ligne
  await db.update(whatsappSettings).set({ remindersEnabled: actif, reminderOffsets: propres, updatedAt: new Date() });
  revalidatePath("/echeances");
  return { ok: true as const };
}

/** Pas de rappel pour cet inscrit (arrangement de paiement), ou le rétablir. */
export async function exclureRappelAction(leadId: string, exclu: boolean) {
  await requireUser();
  await exiger("argent", "gerer");
  await db.update(leads).set({ noPaymentReminder: exclu }).where(eq(leads.id, leadId));
  revalidatePath("/echeances");
  return { ok: true as const };
}

export async function apercuRappelsAction() {
  await requireUser();
  await exiger("argent", "voir");
  const { apercuRappels } = await import("@/lib/rappels-echeances");
  return apercuRappels();
}
