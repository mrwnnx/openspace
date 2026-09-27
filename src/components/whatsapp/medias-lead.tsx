"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mediasLeadAction } from "@/app/whatsapp-actions";
import type { ElementMedia, Lien } from "@/lib/medias-lead";
import { APP_TIMEZONE } from "@/lib/config";

type Donnees = { medias: ElementMedia[]; justificatifs: ElementMedia[]; liens: Lien[] };

const ONGLETS = [
  ["medias", "Médias"],
  ["audio", "Audio"],
  ["documents", "Documents"],
  ["liens", "Liens"],
] as const;
type Onglet = (typeof ONGLETS)[number][0];

const date = (d: string) =>
  new Date(d.replace(" ", "T") + "Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: APP_TIMEZONE });
const sens = (s: string) => (s === "inbound" ? "reçu" : "envoyé");

/**
 * « Médias, liens et documents » d'un lead, comme l'écran de WhatsApp. Chargé
 * à l'ouverture seulement : des URL signées coûtent un appel au stockage.
 */
export function MediasLead({ leadId }: { leadId: string }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("medias");

  useEffect(() => {
    let vivant = true;
    mediasLeadAction(leadId)
      .then((d) => vivant && setDonnees(d))
      .catch(() => vivant && setErreur(true));
    return () => {
      vivant = false;
    };
  }, [leadId]);

  if (erreur) return <p className="p-4 text-xs text-red-600">Chargement impossible. Réessayez.</p>;
  if (!donnees) return <p className="p-4 text-xs text-muted-foreground">Chargement…</p>;

  const visuels = donnees.medias.filter((m) => m.kind === "image" || m.kind === "video" || m.kind === "sticker");
  const audios = donnees.medias.filter((m) => m.kind === "audio");
  const documents = [...donnees.justificatifs, ...donnees.medias.filter((m) => m.kind === "document")];
  const compte: Record<Onglet, number> = {
    medias: visuels.length,
    audio: audios.length,
    documents: documents.length,
    liens: donnees.liens.length,
  };

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 border-b border-border px-3 pt-2">
        {ONGLETS.map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-xs font-medium",
              onglet === cle ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {libelle}
            <span className="ml-1 text-[12px] text-muted-foreground">{compte[cle]}</span>
          </button>
        ))}
      </div>

      <div className="p-3">
        {compte[onglet] === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Rien pour l&apos;instant.</p>}

        {onglet === "medias" && visuels.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {visuels.map((m) => (
              <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden rounded-lg bg-muted" title={`${sens(m.sens)} · ${date(m.date)}`}>
                {m.kind === "video" ? (
                  <video src={m.url} preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[11px] text-white">
                  {m.kind === "video" ? "▶ " : ""}{date(m.date)}
                </span>
              </a>
            ))}
          </div>
        )}

        {onglet === "audio" &&
          audios.map((m) => (
            <div key={m.url} className="mb-2 flex items-center gap-2">
              <audio src={m.url} controls preload="none" className="h-9 min-w-0 flex-1" />
              <span className="shrink-0 text-[12px] text-muted-foreground">{sens(m.sens)} · {date(m.date)}</span>
            </div>
          ))}

        {onglet === "documents" &&
          documents.map((m) => (
            <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="mb-1.5 flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50">
              <span className="text-base">{m.kind === "justificatif" ? "🧾" : "📄"}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.nom ?? "Document"}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {m.kind === "justificatif" ? "justificatif" : sens(m.sens)} · {date(m.date)}
              </span>
            </a>
          ))}

        {onglet === "liens" &&
          donnees.liens.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mb-1.5 flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50">
              <span className="text-base">🔗</span>
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{l.url.replace(/^https?:\/\//, "")}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{sens(l.sens)} · {date(l.date)}</span>
            </a>
          ))}
      </div>
    </div>
  );
}

/** Le bouton de l'en-tête de conversation : ouvre la vue dans un panneau. */
export function BoutonMediasLead({ leadId }: { leadId: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="shrink-0 text-[12.5px] text-muted-foreground hover:text-foreground"
        title="Médias, liens et documents échangés"
      >
        Médias
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOuvert(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Médias, liens et documents</p>
              <button type="button" onClick={() => setOuvert(false)} className="text-sm text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <MediasLead leadId={leadId} />
          </div>
        </div>
      )}
    </>
  );
}
