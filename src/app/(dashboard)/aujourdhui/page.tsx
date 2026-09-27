import Link from "next/link";
import { getCallQueue } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { CallQueue } from "@/components/leads/call-queue";
import { a, exigerPage } from "@/lib/droits";
import { messagesEnAttente, propositionsEnAttente, tachesDuJour } from "@/lib/ma-journee";
import { cn } from "@/lib/utils";
import { TacheFaite } from "@/components/leads/tache-faite";
import { APP_TIMEZONE } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * « Ma journée » (27/09) : l'accueil. Tout ce qui attend un geste aujourd'hui —
 * les WhatsApp sans réponse (la fenêtre de 24 h qui se ferme d'abord), les
 * tâches dues, puis les appels à passer dans l'ordre.
 */
export default async function TodayPage() {
  const droits = await exigerPage("leads");
  const voirWhatsApp = a(droits, "whatsapp", "voir");
  const gererLeads = a(droits, "leads", "gerer");
  const [queue, messages, propositions, taches] = await Promise.all([
    getCallQueue(40),
    voirWhatsApp ? messagesEnAttente(droits.email) : Promise.resolve([]),
    voirWhatsApp ? propositionsEnAttente(20) : Promise.resolve([]),
    tachesDuJour(droits.email),
  ]);
  const proposition = new Map(propositions.map((p) => [p.leadId, p]));
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE });

  return (
    <>
      <PageHeader title="Ma journée" subtitle={date.charAt(0).toUpperCase() + date.slice(1)} />
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* En un coup d'œil */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ["💬", "à répondre", messages.length, "#whatsapp"],
              ["✓", "tâches", taches.length, "#taches"],
              ["📞", "à appeler", queue.length, "#appels"],
            ].map(([icone, libelle, n, ancre]) => (
              <a key={ancre as string} href={ancre as string} className="rounded-xl border border-border bg-card p-3 text-center hover:bg-muted/40">
                <p className="text-xl font-semibold tabular-nums text-foreground">{n as number}</p>
                <p className="text-xs text-muted-foreground">
                  {icone} {libelle}
                </p>
              </a>
            ))}
          </div>

          {voirWhatsApp && (
            <section id="whatsapp">
              <h2 className="mb-2 font-heading text-sm font-semibold text-foreground">À répondre sur WhatsApp</h2>
              {messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Personne n&apos;attend de réponse. 🎉
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {messages.map((m) => {
                    const p = proposition.get(m.leadId);
                    const urgent = m.heuresRestantes < 4;
                    return (
                      <li key={m.leadId}>
                        <Link href={`/whatsapp?lead=${m.leadId}`} className="block px-4 py-3 hover:bg-muted/40">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-foreground">{m.nom}</span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[12px]",
                                urgent ? "bg-red-50 font-medium text-red-700" : "bg-muted text-muted-foreground"
                              )}
                              title="Après 24 h sans message de sa part, WhatsApp n'accepte plus qu'un modèle."
                            >
                              {m.heuresRestantes < 1 ? "ferme dans < 1 h" : `ferme dans ${Math.floor(m.heuresRestantes)} h`}
                            </span>
                          </div>
                          <p dir="auto" className="mt-0.5 truncate text-sm text-muted-foreground">{m.apercu}</p>
                          {p && (
                            <p className="mt-1 text-[12px] text-violet-700">
                              ✨ {p.decision === "escalade" ? "L'assistant a passé la main" : `Réponse prête (${p.score} %)`}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          <section id="taches">
            <h2 className="mb-2 font-heading text-sm font-semibold text-foreground">Tâches du jour</h2>
            {taches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Aucune tâche due aujourd&apos;hui.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {taches.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 pl-4">
                    {gererLeads && <TacheFaite id={t.id} />}
                    <Link
                      href={t.leadId ? `/leads/${t.leadId}` : "/tasks"}
                      className={cn("flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5 pr-4 hover:bg-muted/40", !gererLeads && "-ml-3 pl-3")}
                    >
                      <span className="min-w-0 truncate text-sm text-foreground">
                        {t.priorite === "high" && <span className="mr-1 text-red-600">●</span>}
                        {t.titre}
                      </span>
                      {t.enRetard && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">en retard</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="appels">
            <h2 className="mb-1 font-heading text-sm font-semibold text-foreground">Appels à passer</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Classement : intention lue par l&apos;IA, ancienneté dans la colonne, formule choisie, et surtout{" "}
              <strong>qui a déjà été appelé</strong>. Chaque ligne affiche les raisons de sa place.
            </p>
            <CallQueue leads={queue} />
          </section>
        </div>
      </div>
    </>
  );
}
