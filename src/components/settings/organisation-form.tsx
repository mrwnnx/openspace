"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrganisationAction } from "@/app/actions";

export type OrganisationForm = {
  nom: string;
  description: string;
  langue: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
};

const CHAMP = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring";
const LIBELLE = "mb-1 block text-[12.5px] font-medium text-foreground";
const AIDE = "text-[12px] text-muted-foreground";

/** Coordonnée tapée → nombre, ou null si vide ; NaN si illisible. */
function coord(v: string): number | null {
  const t = v.trim().replace(",", ".");
  return t ? Number(t) : null;
}

export function OrganisationForm({ initial }: { initial: OrganisationForm }) {
  const router = useRouter();
  const [nom, setNom] = useState(initial.nom);
  const [description, setDescription] = useState(initial.description);
  const [langue, setLangue] = useState(initial.langue);
  const [adresse, setAdresse] = useState(initial.adresse);
  const [lat, setLat] = useState(initial.latitude?.toString() ?? "");
  const [lng, setLng] = useState(initial.longitude?.toString() ?? "");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function enregistrer() {
    setMessage(null);
    startTransition(async () => {
      const r = await saveOrganisationAction({
        nom,
        description,
        langue,
        adresse,
        latitude: coord(lat),
        longitude: coord(lng),
      });
      setMessage(r.ok ? { ok: true, texte: "Enregistré." } : { ok: false, texte: r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className={LIBELLE}>Nom</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Mon école" className={CHAMP} />
      </label>
      <label className="block">
        <span className={LIBELLE}>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Formations en design UX/UI pour débutants, en présentiel et en ligne"
          className={`${CHAMP} resize-y`}
        />
        <span className={AIDE}>L&apos;assistant IA s&apos;en sert pour présenter l&apos;école.</span>
      </label>
      <label className="block">
        <span className={LIBELLE}>Langue des échanges</span>
        <input
          value={langue}
          onChange={(e) => setLangue(e.target.value)}
          placeholder="français — ou : derja tunisienne en lettres arabes"
          className={CHAMP}
        />
        <span className={AIDE}>Vide : l&apos;assistant répond dans la langue du message reçu.</span>
      </label>
      <label className="block">
        <span className={LIBELLE}>Adresse</span>
        <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="12 rue Exemple, Ville" className={CHAMP} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={LIBELLE}>Latitude</span>
          <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="36.80" className={CHAMP} />
        </label>
        <label className="block">
          <span className={LIBELLE}>Longitude</span>
          <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="10.18" className={CHAMP} />
        </label>
      </div>
      <p className={AIDE}>Adresse et coordonnées : pour le bouton « Envoyer la localisation » sur WhatsApp. Facultatif.</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && (
          <span className={message.ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>{message.texte}</span>
        )}
      </div>
    </div>
  );
}
