import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les actions serveur reçoivent 1 Mo au plus par défaut : trop peu pour une
  // brochure PDF donnée à l'assistant WhatsApp. 4,5 Mo = le plafond d'une
  // requête sur Vercel ; au-delà, l'action le dit avant d'envoyer.
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // En-têtes de sécurité (audits du 2026-09-20 et du 26/09).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Un CRM authentifié n'a rien à faire dans une iframe tierce
          // (clickjacking). Les aperçus d'email sont en `srcDoc` : non concernés.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Les liens sortants (Luma, WordPress…) ne reçoivent que l'origine.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // CSP partielle (audit 26/09) : les règles qui ne peuvent rien casser —
          // pas de plugin, pas de <base> détourné, formulaires vers nous seuls,
          // pas d'iframe tierce. Les scripts restent sans CSP (Next + Tiptap
          // demandent une vraie recette avec des nonces).
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
