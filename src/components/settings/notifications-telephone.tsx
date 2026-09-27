"use client";

import { useEffect, useState } from "react";
import { EVENEMENTS_PUSH, VAPID_PUBLIC_KEY } from "@/lib/push-public";
import {
  abonnerPushAction,
  desabonnerPushAction,
  evenementsPushAction,
  majEvenementsPushAction,
  testerPushAction,
} from "@/app/push-actions";

const PAR_DEFAUT = ["message", "escalade", "attribue", "tache"];

function cle(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Activer les notifications sur CE téléphone ou cet ordinateur, et choisir lesquelles. */
export function NotificationsTelephone() {
  const [etat, setEtat] = useState<"chargement" | "impossible" | "ios" | "off" | "on" | "refuse">("chargement");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>(PAR_DEFAUT);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      // Installation sans clés VAPID : pas de notifications (docs/notifications.md).
      if (!VAPID_PUBLIC_KEY) return setEtat("impossible");
      const ios = /iphone|ipad/i.test(navigator.userAgent);
      const installe = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setEtat(ios && !installe ? "ios" : "impossible");
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return setEtat("off");
      setEndpoint(sub.endpoint);
      const ev = await evenementsPushAction(sub.endpoint);
      if (!ev) return setEtat("off");
      setEvents(ev);
      setEtat("on");
    })().catch(() => setEtat("impossible"));
  }, []);

  async function activer() {
    if (!VAPID_PUBLIC_KEY) return;
    setPending(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setEtat("refuse");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle(VAPID_PUBLIC_KEY) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await abonnerPushAction(json, events, navigator.userAgent);
      if (!r.ok) return setMsg(r.error);
      setEndpoint(sub.endpoint);
      setEtat("on");
      await testerPushAction();
      setMsg("Activé : une notification d'essai vient de partir.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Activation impossible.");
    } finally {
      setPending(false);
    }
  }

  async function desactiver() {
    if (!endpoint) return;
    setPending(true);
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
    await desabonnerPushAction(endpoint);
    setEndpoint(null);
    setEtat("off");
    setPending(false);
  }

  async function basculer(id: string, coche: boolean) {
    const suivant = coche ? [...events, id] : events.filter((e) => e !== id);
    setEvents(suivant);
    if (endpoint && etat === "on") await majEvenementsPushAction(endpoint, suivant);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 font-heading text-sm font-semibold text-foreground">Notifications sur ce téléphone</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Reçues même quand le CRM est fermé. À activer sur chaque appareil (téléphone, ordinateur).
      </p>

      {etat === "chargement" && <p className="text-xs text-muted-foreground">…</p>}
      {etat === "impossible" && <p className="text-xs text-red-600">Ce navigateur ne gère pas les notifications. Sur Android, utilisez Chrome.</p>}
      {etat === "ios" && (
        <p className="text-xs text-amber-700">
          Sur iPhone : ouvrez le CRM dans Safari → bouton Partager → « Sur l&apos;écran d&apos;accueil », puis ouvrez le CRM depuis
          cette icône et revenez ici.
        </p>
      )}
      {etat === "refuse" && (
        <p className="text-xs text-red-600">
          Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur (cadenas à côté de l&apos;adresse), puis rechargez.
        </p>
      )}

      {(etat === "on" || etat === "off") && (
        <>
          <div className="mb-3 space-y-1.5">
            {EVENEMENTS_PUSH.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={events.includes(e.id)} onChange={(x) => basculer(e.id, x.target.checked)} />
                {e.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {etat === "off" ? (
              <button type="button" disabled={pending} onClick={activer} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                {pending ? "…" : "Activer sur cet appareil"}
              </button>
            ) : (
              <>
                <span className="text-xs font-medium text-green-700">✓ Activées sur cet appareil</span>
                <button type="button" onClick={() => testerPushAction().then(() => setMsg("Essai envoyé."))} className="text-xs text-primary hover:underline">
                  Envoyer un essai
                </button>
                <button type="button" disabled={pending} onClick={desactiver} className="text-xs text-muted-foreground hover:text-red-600">
                  Désactiver
                </button>
              </>
            )}
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
          </div>
        </>
      )}
    </section>
  );
}
