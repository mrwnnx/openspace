import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getBootcamps } from "@/lib/queries";
import { getEcheances } from "@/lib/echeances";
import { apercuRappels } from "@/lib/rappels-echeances";
import { RappelsReglages, ExclureRappel } from "@/components/echeances/rappels";
import { cn, formatDate } from "@/lib/utils";
import { exigerPage } from "@/lib/droits";
import { APP_TIMEZONE } from "@/lib/config";

export const dynamic = "force-dynamic";

const STATUTS = [
  { id: "", label: "Toutes" },
  { id: "retard", label: "En retard" },
  { id: "avenir", label: "À venir" },
  { id: "payee", label: "Payées" },
] as const;

/**
 * Toutes les échéances des élèves, par formation : ce qui est encaissé, ce qui
 * reste, ce qui est en retard — et les rappels WhatsApp qui partent tout seuls.
 */
export default async function EcheancesPage({
  searchParams,
}: {
  searchParams: Promise<{ formation?: string; statut?: string }>;
}) {
  await exigerPage("argent");
  const { formation, statut } = await searchParams;
  const aujourdhui = new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
  const [lignes, formations, rappels] = await Promise.all([getEcheances(formation || null), getBootcamps(), apercuRappels()]);

  const enRetard = (l: (typeof lignes)[number]) => !l.payee && !!l.due && l.due < aujourdhui;
  const visibles = lignes.filter((l) =>
    statut === "retard" ? enRetard(l) : statut === "avenir" ? !l.payee && !enRetard(l) : statut === "payee" ? l.payee : true
  );
  const somme = (f: (l: (typeof lignes)[number]) => boolean) => lignes.filter(f).reduce((s, l) => s + l.montant, 0);
  const encaisse = somme((l) => l.payee);
  const reste = somme((l) => !l.payee);
  const retard = somme(enRetard);
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} DT`;
  const lien = (p: { formation?: string; statut?: string }) => {
    const sp = new URLSearchParams();
    const f = p.formation ?? formation ?? "";
    const s = p.statut ?? statut ?? "";
    if (f) sp.set("formation", f);
    if (s) sp.set("statut", s);
    return `/echeances${sp.toString() ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Échéances" subtitle="Les paiements des élèves, formation par formation" />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {[
              ["Encaissé", encaisse, "text-green-700"],
              ["Reste à encaisser", reste, "text-foreground"],
              ["En retard", retard, retard > 0 ? "text-red-600" : "text-foreground"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl border border-border bg-card p-3 md:p-4">
                <p className="text-[12px] text-muted-foreground md:text-xs">{l}</p>
                <p className={cn("mt-1 text-base font-semibold tabular-nums md:text-xl", c as string)}>{fmt(v as number)}</p>
              </div>
            ))}
          </div>

          {/* Téléphone : les filtres défilent de côté au lieu de prendre 5 lignes. */}
          <div className="-mx-5 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
            <Link href={lien({ formation: "" })} className={cn("rounded-md border px-2.5 py-1 text-xs", !formation ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
              Toutes les formations
            </Link>
            {formations.map((b) => (
              <Link key={b.id} href={lien({ formation: b.id })} className={cn("rounded-md border px-2.5 py-1 text-xs", formation === b.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
                {b.name}
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            {STATUTS.map((s) => (
              <Link key={s.id} href={lien({ statut: s.id })} className={cn("rounded-md px-2.5 py-1 text-xs", (statut ?? "") === s.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s.label}
              </Link>
            ))}
          </div>

          {/* Téléphone : une carte par échéance. */}
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {visibles.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/leads/${l.leadId}`} className="truncate font-medium text-foreground">{l.nom}</Link>
                  <span className="shrink-0 font-semibold tabular-nums">{fmt(l.montant)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {l.formation ?? "—"} · échéance {l.rang}/{l.total} · {l.due ? formatDate(l.due) : "sans date"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {l.payee ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[12px] text-green-700">Payée</span>
                  ) : enRetard(l) ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] text-red-700">En retard</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">À venir</span>
                  )}
                  {l.dernierRappel && <span className="text-[12px] text-muted-foreground">rappel {formatDate(l.dernierRappel)}</span>}
                  {!l.payee && <ExclureRappel leadId={l.leadId} exclu={l.sansRappel} />}
                </div>
              </li>
            ))}
            {visibles.length === 0 && <li className="p-6 text-center text-xs text-muted-foreground">Aucune échéance ici.</li>}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            {visibles.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Aucune échéance ici.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Élève</th>
                    <th className="px-3 py-2 font-medium">Formation</th>
                    <th className="px-3 py-2 font-medium">Échéance</th>
                    <th className="px-3 py-2 text-right font-medium">Montant</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">État</th>
                    <th className="px-3 py-2 font-medium">Rappel WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Link href={`/leads/${l.leadId}`} className="font-medium text-foreground hover:text-primary">{l.nom}</Link>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.formation ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.rang}/{l.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(l.montant)}</td>
                      <td className="px-3 py-2 text-xs">{l.due ? formatDate(l.due) : "—"}</td>
                      <td className="px-3 py-2">
                        {l.payee ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[12px] text-green-700">Payée</span>
                        ) : enRetard(l) ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] text-red-700">En retard</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">À venir</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.dernierRappel ? `${formatDate(l.dernierRappel)} · ${l.dernierRappelResultat ?? ""}` : "—"}
                        {!l.payee && <ExclureRappel leadId={l.leadId} exclu={l.sansRappel} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <RappelsReglages
            actif={rappels.actif}
            moments={rappels.moments}
            aVenir={rappels.aVenir}
            historique={rappels.historique}
          />
        </div>
      </div>
    </>
  );
}
