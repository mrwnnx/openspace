import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { BarreOnglets } from "@/components/barre-onglets";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { WhatsAppNotifier } from "@/components/whatsapp/notifier";
import { TeamProfilesProvider } from "@/components/team-profiles";
import { getTeamProfiles } from "@/lib/profiles";
import { currentActor } from "@/lib/auth";
import { mesDroits } from "@/lib/droits";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Les noms et photos de l'équipe, une fois pour tout l'écran : chaque auteur
  // affiché (fil, kanban, échéancier, WhatsApp) les lit depuis ce contexte.
  const [profiles, me, droits] = await Promise.all([getTeamProfiles(), currentActor(), mesDroits()]);

  return (
    <TeamProfilesProvider profiles={profiles} me={me}>
      {/* fixed inset-0, pas h-screen : sur iPhone (app installée, viewport-fit=cover)
          100vh dépasse l'écran visible et la barre d'onglets tombait sous le bord. */}
      <div className="fixed inset-0 flex overflow-hidden bg-background">
        <Sidebar niveaux={droits.niveaux} />
        <main className="flex flex-1 flex-col overflow-hidden pt-12 lg:pt-0">
          {children}
          <BarreOnglets niveaux={droits.niveaux} />
        </main>
        {/* Disponible sur tous les écrans du CRM, jamais dans le chemin. */}
        <AssistantPanel />
        {/* Le « bip » d'un WhatsApp reçu, où qu'on soit dans le CRM. */}
        {droits.niveaux.whatsapp !== "aucun" && <WhatsAppNotifier />}
      </div>
    </TeamProfilesProvider>
  );
}
