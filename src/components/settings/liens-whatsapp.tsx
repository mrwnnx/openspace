"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { creerLienAction, listerLiensAction, supprimerLienAction } from "@/app/whatsapp-actions";

type Lien = Awaited<ReturnType<typeof listerLiensAction>>[number];

const champ = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring";

/**
 * Un lien WhatsApp (et son QR code) par source : bio Instagram, flyer, salon…
 * Le code en fin de message pré-rempli dit au CRM d'où vient le lead.
 */
export function LiensWhatsApp() {
  const [liens, setLiens] = useState<Lien[] | null>(null);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("Bonjour 👋 J'aimerais en savoir plus sur votre formation");
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const charger = useCallback(() => {
    listerLiensAction().then(setLiens).catch(() => setLiens([]));
  }, []);
  useEffect(charger, [charger]);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 font-heading text-sm font-semibold text-foreground">Liens et QR codes par source</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Un lien par endroit où vous le publiez. Le message pré-rempli se termine par un code : quand un nouveau lead
        l&apos;envoie, sa fiche est rangée dans la source « WhatsApp — nom du lien », comptée dans Analytics.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErreur(null);
          start(async () => {
            const r = await creerLienAction(nom, message);
            if (!r.ok) return setErreur(r.error);
            setNom("");
            charger();
          });
        }}
        className="mb-5 grid gap-2 sm:grid-cols-[180px_1fr_auto]"
      >
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom : Bio Instagram" className={champ} required />
        <input dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message pré-rempli" className={champ} required />
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          {pending ? "…" : "Créer le lien"}
        </button>
        {erreur && <p className="text-xs text-red-600 sm:col-span-3">{erreur}</p>}
      </form>

      {!liens ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : liens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Aucun lien pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {liens.map((l) => (
            <div key={l.id} className="flex gap-4 rounded-lg border border-border p-3">
              {/* eslint-disable-next-line react/no-danger -- SVG produit par le serveur à partir de notre propre URL */}
              <div className="h-28 w-28 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: l.qr }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {l.nom} <span className="font-mono text-[12px] text-muted-foreground">({l.code})</span>
                </p>
                <p dir="auto" className="mt-0.5 truncate text-xs text-muted-foreground">{l.message}</p>
                <p className="mt-1 text-xs text-foreground">
                  {l.leads} lead{l.leads > 1 ? "s" : ""} · {l.inscrits} inscrit{l.inscrits > 1 ? "s" : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(l.url).then(() => {
                        setCopie(l.id);
                        setTimeout(() => setCopie(null), 1500);
                      });
                    }}
                    className="text-primary hover:underline"
                  >
                    {copie === l.id ? "Copié ✓" : "Copier le lien"}
                  </button>
                  <a
                    href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(l.qr)}`}
                    download={`qr-whatsapp-${l.code}.svg`}
                    className="text-primary hover:underline"
                  >
                    Télécharger le QR
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await supprimerLienAction(l.id);
                        charger();
                      })
                    }
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
