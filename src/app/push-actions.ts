"use server";

import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

type Abonnement = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Ce téléphone reçoit les notifications de ce membre. */
export async function abonnerPushAction(sub: Abonnement, events: string[], appareil: string) {
  const user = await requireUser();
  if (!user.email || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false as const, error: "Abonnement invalide." };
  await db
    .insert(pushSubscriptions)
    .values({ userEmail: user.email, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, events, appareil: appareil.slice(0, 120) })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userEmail: user.email, p256dh: sub.keys.p256dh, auth: sub.keys.auth, events } });
  return { ok: true as const };
}

export async function desabonnerPushAction(endpoint: string) {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userEmail, user.email ?? "")));
  return { ok: true as const };
}

/** Les événements choisis pour cet appareil (null = pas abonné). */
export async function evenementsPushAction(endpoint: string) {
  const user = await requireUser();
  const a = await db.query.pushSubscriptions.findFirst({
    where: and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userEmail, user.email ?? "")),
  });
  return a?.events ?? null;
}

export async function majEvenementsPushAction(endpoint: string, events: string[]) {
  const user = await requireUser();
  await db.update(pushSubscriptions).set({ events }).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userEmail, user.email ?? "")));
  return { ok: true as const };
}

/** Une notification d'essai, vers les appareils de ce membre. */
export async function testerPushAction() {
  const user = await requireUser();
  const { envoyerPush } = await import("@/lib/push");
  for (const e of ["message", "escalade", "attribue", "tache"] as const) {
    // Un seul essai suffit : le premier événement coché fera l'affaire.
    await envoyerPush({ evenement: e, titre: "openspace", corps: "Les notifications marchent sur ce téléphone ✅", url: "/aujourdhui", tag: "essai", pour: user.email });
    break;
  }
  return { ok: true as const };
}
