# Email (Resend)

**Ce que ça apporte** : invitations de l'équipe, « mot de passe oublié », modèles et campagnes, automatisations par email, résumé quotidien.
Sans email configuré, le CRM fonctionne, mais ne peut ni inviter quelqu'un ni réinitialiser un mot de passe.

## Étapes

1. Créez un compte sur [resend.com](https://resend.com).
2. **Domains → Add domain** : utilisez de préférence un sous-domaine dédié (par exemple `send.mon-ecole.com`). Ajoutez chez votre hébergeur DNS les enregistrements affichés (SPF, DKIM), puis attendez le statut **Verified**.
3. **API Keys → Create** → `RESEND_API_KEY`.
4. Variables :
   - `EMAIL_FROM="Mon école <bonjour@send.mon-ecole.com>"` : l'adresse doit être sur le domaine vérifié ;
   - `RESEND_SENDER_DOMAIN=send.mon-ecole.com` : le CRM refuse alors une adresse d'expédition hors de ce domaine (Réglages → Habillage) ;
   - `EMAIL_REPLY_TO` (facultatif) : l'adresse qui reçoit les réponses ;
   - `EMAIL_DAILY_LIMIT` : 100 sur le plan gratuit ; augmentez-le si vous passez sur un plan payant.
5. **Suivi des ouvertures, clics et rebonds** (facultatif) : Resend → **Webhooks → Add** → URL `https://VOTRE-CRM/api/webhook/resend`, avec tous les événements `email.*`. Copiez le *Signing secret* dans `RESEND_WEBHOOK_SECRET`.

## Vérifier

Réglages → Emails → ouvrez un modèle → **Envoyer un test** à votre adresse.

Désabonnement : chaque campagne et chaque automatisation porte un lien de désabonnement et l'en-tête « en un clic » exigé par Gmail. Vous n'avez rien à faire.
