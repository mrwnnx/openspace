"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, formatDate } from "@/lib/utils";
import { exclureRappelAction, reglerRappelsAction } from "@/app/echeances-actions";

const MOMENTS = [
  { v: -7, l: "7 j avant" },
  { v: -3, l: "3 j avant" },
  { v: -1, l: "La veille" },
  { v: 0, l: "Le jour J" },
  { v: 3, l: "3 j après" },
  { v: 7, l: "7 j après" },
];

/** « Pas de rappel » pour cet élève — arrangement de paiement. */
export function ExclureRappel({ leadId, exclu }: { leadId: string; exclu: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={cn("ml-2 inline-flex cursor-pointer items-center gap-1 text-[12px]", exclu ? "text-amber-700" : "text-muted-foreground")}>
      <input
        type="checkbox"
        checked={exclu}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await exclureRappelAction(leadId, e.target.checked);
            router.refresh();
          })
        }
      />
      pas de rappel
    </label>
  );
}

/** Les rappels WhatsApp automatiques : marche/arrêt, moments, prochains envois, historique. */
export function RappelsReglages({
  actif,
  moments,
  aVenir,
  historique,
}: {
  actif: boolean;
  moments: number[];
  aVenir: { date: string; nom: string; leadId: string; montant: string; due: string; moment: string }[];
  historique: { nom: string; lead_id: string; moment: string; sent_at: string; result: string | null; montant: string; due: string }[];
}) {
  const router = useRouter();
  const [on, setOn] = useState(actif);
  const [choix, setChoix] = useState<number[]>(moments);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">Rappels WhatsApp automatiques</h2>
          <p className="text-xs text-muted-foreground">
            Modèle « echeance_rappel », entre 9 h et 20 h, une seule fois par moment et par échéance. Le texte se modifie dans
            Paramètres → WhatsApp → Modèles.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
          {on ? "Actifs" : "Arrêtés"}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {MOMENTS.map((m) => (
          <label key={m.v} className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs", choix.includes(m.v) ? "border-primary bg-primary/5" : "border-border")}>
            <input
              type="checkbox"
              checked={choix.includes(m.v)}
              onChange={(e) => setChoix(e.target.checked ? [...choix, m.v] : choix.filter((x) => x !== m.v))}
            />
            {m.l}
          </label>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await reglerRappelsAction(on, choix);
              setMsg("Enregistré.");
              router.refresh();
            })
          }
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Enregistrer
        </button>
        {msg && <span className="text-xs text-green-700">{msg}</span>}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-foreground">Prochains 7 jours</h3>
          {aVenir.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun rappel prévu.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {aVenir.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    <b className="font-medium">{formatDate(r.date)}</b> · {r.nom}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(Number(r.montant))} DT · {r.moment}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-foreground">Déjà envoyés</h3>
          {historique.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun rappel envoyé pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {historique.map((h, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    <b className="font-medium">{formatDate(h.sent_at)}</b> · {h.nom} · {h.moment}
                  </span>
                  <span className={h.result === "envoyé" ? "text-green-700" : "text-red-600"}>{h.result ?? "…"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
