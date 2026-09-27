import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    // Téléphone : le titre garde toute la largeur, les actions passent dessous
    // et défilent de côté (le titre « Formations » finissait en « F… »).
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-border bg-background px-4 py-2 md:h-14 md:flex-nowrap md:px-5 md:py-0">
      <div className="min-w-0 flex-1 basis-full md:basis-auto">
        <h1 className="truncate text-base font-semibold text-foreground font-heading">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="-mx-1 flex w-full max-w-full items-center gap-2 overflow-x-auto px-1 md:mx-0 md:w-auto md:shrink-0 md:flex-wrap md:justify-end md:overflow-visible md:px-0">
          {actions}
        </div>
      )}
    </header>
  );
}
