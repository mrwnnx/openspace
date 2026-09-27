import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGroteskHeading = Space_Grotesk({subsets:['latin'],variable:'--font-space-grotesk'});

const inter = Inter({subsets:['latin'],variable:'--font-inter'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "openspace",
  description: "CRM open source pour écoles de formation",
};

// « cover » : sans lui, iPhone renvoie 0 pour env(safe-area-inset-bottom) et la
// barre d'onglets passe sous la barre d'accueil (le trait noir en bas).
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, spaceGroteskHeading.variable)}
    >
      {/* suppressHydrationWarning : les extensions navigateur (ColorZilla, Grammarly…)
          injectent des attributs sur <body> AVANT que React n'hydrate, ce qui
          déclenche un faux avertissement de mismatch. Portée limitée aux
          attributs de ce seul élément — les vrais écarts dans l'arbre restent signalés. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
