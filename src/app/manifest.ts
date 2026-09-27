import type { MetadataRoute } from "next";

// L'application installable (écran d'accueil) : indispensable pour recevoir
// des notifications sur iPhone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "openspace",
    short_name: "openspace",
    start_url: "/aujourdhui",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
