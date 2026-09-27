"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, WhatsappIcon, User02Icon, Menu02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { WhatsAppUnreadBadge } from "@/components/whatsapp/unread-badge";
import { RANG, type Niveaux } from "@/lib/droits-domaines";

/*
 * Mobile (27/09) : les trois écrans du quotidien à portée de pouce, « Plus »
 * ouvre le menu complet. Dans le flux (pas en fixed) : quand elle disparaît —
 * fiche lead qui a sa propre barre, conversation WhatsApp ouverte (via
 * `main:has([data-fil-ouvert])`) — elle ne laisse pas de vide.
 */
export function BarreOnglets({ niveaux }: { niveaux: Niveaux }) {
  const pathname = usePathname();
  if (/^\/leads\/[^/]+/.test(pathname)) return null;

  const onglets = [
    { href: "/aujourdhui", label: "Ma journée", icon: Call02Icon, ok: RANG[niveaux.leads] >= 1 },
    { href: "/whatsapp", label: "WhatsApp", icon: WhatsappIcon, ok: RANG[niveaux.whatsapp] >= 1 },
    { href: "/leads", label: "Leads", icon: User02Icon, ok: RANG[niveaux.leads] >= 1 },
  ].filter((o) => o.ok);

  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium";
  return (
    <nav className="barre-onglets flex shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {onglets.map((o) => {
        const actif = pathname === o.href || pathname.startsWith(o.href + "/");
        return (
          <Link key={o.href} href={o.href} className={cn(item, actif ? "text-primary" : "text-muted-foreground")}>
            <span className="relative">
              <HugeiconsIcon icon={o.icon} size={20} />
              {o.href === "/whatsapp" && (
                <span className="absolute -right-3 -top-1.5">
                  <WhatsAppUnreadBadge />
                </span>
              )}
            </span>
            {o.label}
          </Link>
        );
      })}
      <button type="button" onClick={() => window.dispatchEvent(new Event("ouvrir-menu"))} className={cn(item, "text-muted-foreground")}>
        <HugeiconsIcon icon={Menu02Icon} size={20} />
        Plus
      </button>
    </nav>
  );
}
