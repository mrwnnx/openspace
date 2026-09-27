"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  User02Icon,
  Contact01Icon,
  Note02Icon,
  Task01Icon,
  Call02Icon,
  Calendar03Icon,
  Setting06Icon,
  Search01Icon,
  Add01Icon,
  Menu02Icon,
  Cancel01Icon,
  GraduationCapIcon,
  Tag01Icon,
  Mail01Icon,
  AiMagicIcon,
  WhatsappIcon,
  Logout03Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WhatsAppUnreadBadge } from "@/components/whatsapp/unread-badge";
import { ActorAvatar, useTeamProfiles } from "@/components/team-profiles";
import { signOutAction } from "@/app/actions";
import { RANG, type Niveaux } from "@/lib/droits-domaines";

type NavItem = {
  href: string;
  label: string;
  icon: typeof User02Icon;
};

// Rangé par usage (27/09) : le travail du jour, puis le pipeline, puis les chiffres.
const primaryNav: NavItem[] = [
  { href: "/aujourdhui", label: "Ma journée", icon: Call02Icon },
  { href: "/whatsapp", label: "WhatsApp", icon: WhatsappIcon },
  { href: "/leads", label: "Leads", icon: User02Icon },
  { href: "/bootcamps", label: "Formations", icon: GraduationCapIcon },
  { href: "/echeances", label: "Échéances", icon: Invoice01Icon },
  { href: "/campaigns", label: "Campagnes", icon: Mail01Icon },
  { href: "/contacts", label: "Contacts", icon: Contact01Icon },
  { href: "/tags", label: "Tags", icon: Tag01Icon },
  { href: "/analytics", label: "Statistiques", icon: Analytics01Icon },
  { href: "/assistant", label: "Assistant", icon: AiMagicIcon },
];

const secondaryNav: NavItem[] = [
  { href: "/tasks", label: "Tâches", icon: Task01Icon },
  { href: "/call-logs", label: "Appels", icon: Call02Icon },
  { href: "/notes", label: "Notes", icon: Note02Icon },
  { href: "/calendar", label: "Calendrier", icon: Calendar03Icon },
  { href: "/data-import", label: "Import", icon: Add01Icon },
];

/** Le droit qu'il faut pour voir chaque entrée (les pages vérifient aussi). */
function visible(href: string, n: Niveaux): boolean {
  const voit = (d: keyof Niveaux, min = 1) => RANG[n[d]] >= min;
  switch (href) {
    case "/assistant":
      return true;
    case "/analytics":
      return voit("stats");
    case "/bootcamps":
      return voit("leads") || voit("formations");
    case "/echeances":
      return voit("argent");
    case "/contacts":
      return voit("contacts");
    case "/data-import":
      return voit("contacts", 2);
    case "/campaigns":
      return voit("campagnes");
    case "/whatsapp":
      return voit("whatsapp");
    default:
      // Aujourd'hui, Leads, Tags, Notes, Tasks, Call Logs, Calendar
      return voit("leads");
  }
}

export function Sidebar({ niveaux }: { niveaux: Niveaux }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // « Plus » de la barre d'onglets mobile.
  useEffect(() => {
    const ouvrir = () => setMobileOpen(true);
    window.addEventListener("ouvrir-menu", ouvrir);
    return () => window.removeEventListener("ouvrir-menu", ouvrir);
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <HugeiconsIcon icon={Menu02Icon} size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            A
          </div>
          <span className="flex-1 text-sm font-semibold text-foreground font-heading">
            openspace
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={15} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {primaryNav.filter((i) => visible(i.href, niveaux)).map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <div className="my-2 h-px bg-border" />

          {secondaryNav.filter((i) => visible(i.href, niveaux)).map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <CurrentUser active={isActive("/settings")} />
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive("/settings") && "bg-muted text-foreground"
              )}
            >
              <HugeiconsIcon icon={Setting06Icon} size={17} />
              Réglages
            </Link>
            {RANG[niveaux.leads] >= 1 && <NotificationBell />}
          </div>
        </div>
      </aside>
    </>
  );
}

// Qui est connecté, et la porte de sortie. Le nom mène à « Mon profil ».
function CurrentUser({ active }: { active: boolean }) {
  const { me, resolve } = useTeamProfiles();
  if (!me) return null;
  const { name } = resolve(me.email);
  return (
    <div className="mb-1 flex items-center gap-1">
      <Link
        href="/settings?tab=profile"
        title={me.email}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          active && "text-foreground"
        )}
      >
        <ActorAvatar email={me.email} size={22} />
        <span className="truncate">{name}</span>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Logout03Icon} size={17} />
        </button>
      </form>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary"
      )}
    >
      <HugeiconsIcon icon={item.icon} size={17} />
      {item.label}
      {item.href === "/whatsapp" && <WhatsAppUnreadBadge />}
    </Link>
  );
}
