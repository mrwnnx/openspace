"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLeadLostAction } from "@/app/actions";

// Les mêmes raisons que sur mobile : c'est ce qui dira, plus tard, pourquoi on perd des inscrits.
const RAISONS = ["Prix", "Dates", "Hors cible", "Ne répond plus", "A choisi ailleurs", "Autre"];

/** Passer en « Perdu » au bureau : la raison est obligatoire, comme sur mobile. */
export function RaisonPerdueDialog({
  leadId,
  statusId,
  nom,
  onClose,
  onDone,
}: {
  leadId: string;
  statusId: string;
  nom: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [raison, setRaison] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-foreground">Pourquoi on perd {nom} ?</h3>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Obligatoire : c&apos;est ce qui dira, plus tard, pourquoi on perd des inscrits.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {RAISONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRaison(r)}
              className={raison === r ? "rounded-lg border border-red-600 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700" : "rounded-lg border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted"}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Précision (facultatif)"
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted">
            Annuler
          </button>
          <button
            type="button"
            disabled={!raison || pending}
            onClick={() =>
              start(async () => {
                const r = await markLeadLostAction(leadId, statusId, raison!, note);
                if (!r.ok) return setErreur(r.message);
                onDone?.();
                onClose();
                router.refresh();
              })
            }
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {pending ? "…" : "Passer en Perdu"}
          </button>
        </div>
      </div>
    </div>
  );
}
