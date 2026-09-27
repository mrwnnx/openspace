# Notifications sur téléphone (Web Push)

**Ce que ça apporte** : une notification sur le téléphone de chaque membre qui l'active (Réglages → Mon profil) pour un nouveau message WhatsApp, une conversation attribuée, un appel à passer, l'assistant qui passe la main ou un nouveau lead.

## Étapes

1. Générez une paire de clés :
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Variables :
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = la clé *Public* ;
   - `VAPID_PRIVATE_KEY` = la clé *Private* (secrète) ;
   - `VAPID_SUBJECT=mailto:vous@mon-ecole.com`.
3. Redéployez.

Sur iPhone, les notifications ne marchent que si le CRM est **ajouté à l'écran d'accueil** (Safari → Partager → Sur l'écran d'accueil).

Sans ces clés, le CRM ne propose simplement pas les notifications.
