// La clé publique VAPID : publique par nature (le navigateur s'abonne avec),
// lue dans NEXT_PUBLIC_VAPID_PUBLIC_KEY. La privée vit dans VAPID_PRIVATE_KEY.
// Sans elles, les notifications téléphone sont désactivées (docs/notifications.md).
export { VAPID_PUBLIC_KEY } from "@/lib/config";

export const EVENEMENTS_PUSH = [
  { id: "message", label: "Nouveau message WhatsApp d'un lead" },
  { id: "escalade", label: "L'assistant passe la main" },
  { id: "attribue", label: "Une conversation m'est attribuée" },
  { id: "tache", label: "Un appel à faire maintenant" },
  { id: "lead", label: "Un nouveau lead (formulaire du site)" },
] as const;
