import "server-only";
import webpush from "web-push";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/lib/config";

/*
 * Notifications sur le téléphone (Web Push). Chaque membre active les
 * notifications sur ses appareils (Paramètres → Mon profil) et choisit les
 * événements. `pour` = un seul membre (conversation attribuée) ; sinon tous
 * ceux qui ont coché l'événement. Un abonnement mort (404/410) est supprimé.
 */

let pret = false;
function configurer() {
  if (pret) return true;
  const prive = process.env.VAPID_PRIVATE_KEY;
  if (!prive || !VAPID_PUBLIC_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@example.com", VAPID_PUBLIC_KEY, prive);
  pret = true;
  return true;
}

export type EvenementPush = "message" | "escalade" | "attribue" | "tache" | "lead";

export async function envoyerPush(input: {
  evenement: EvenementPush;
  titre: string;
  corps: string;
  url: string;
  tag?: string; // même tag = la notification remplace la précédente (une par conversation)
  pour?: string | null; // un membre précis
  sauf?: string | null; // ne pas notifier l'auteur de l'action
}) {
  try {
    if (!configurer()) return;
    const abonnes = await db.execute<{ id: string; endpoint: string; p256dh: string; auth: string; user_email: string }>(sql`
      select id, endpoint, p256dh, auth, user_email from push_subscriptions
      where ${input.evenement} = any(events)
        and ${input.pour ? sql`lower(user_email) = lower(${input.pour})` : sql`true`}
        and ${input.sauf ? sql`lower(user_email) <> lower(${input.sauf})` : sql`true`}`);
    const charge = JSON.stringify({ titre: input.titre, corps: input.corps.slice(0, 180), url: input.url, tag: input.tag });
    await Promise.all(
      abonnes.map(async (a) => {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 3600 });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, a.id));
          else console.error("Push :", code, (e as Error).message);
        }
      })
    );
  } catch (e) {
    console.error("Notifications push :", e);
  }
}
