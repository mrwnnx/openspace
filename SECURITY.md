# Sécurité

## Signaler une faille

Merci de ne **pas** ouvrir d'issue publique. Utilisez l'onglet **Security → Report a vulnerability** du dépôt (signalement privé GitHub). Décrivez le problème et comment le reproduire.

## Ce qui protège vos données

- **Base verrouillée** : RLS activé et tous les droits retirés aux rôles `anon` et `authenticated` sur **toutes** les tables (et par défaut sur les futures). Les clés publiques de Supabase ne lisent rien. Le CRM parle à la base côté serveur uniquement.
- **Clé service_role** utilisée côté serveur seulement, jamais envoyée au navigateur.
- **Inscription publique Supabase désactivée** (INSTALL.md, étape 2) : les comptes sont créés par le CRM. Le premier compte propriétaire ne peut être créé qu'une fois, sous verrou, puis tout passe par invitation.
- **Invitations** : le mot de passe se choisit après le clic sur le lien reçu par email, ce qui prouve la possession de la boîte.
- **Fichiers** : justificatifs de paiement et médias WhatsApp dans des espaces **privés**, servis par liens signés. Les images insérées dans les emails et les photos de profil sont dans des espaces **publics** (une boîte mail doit pouvoir lire une image) : n'y mettez rien de confidentiel.
- **Webhooks signés** : Meta (signature `WHATSAPP_APP_SECRET`), Resend (Svix, `RESEND_WEBHOOK_SECRET`), Tutor (`TUTOR_WEBHOOK_SECRET`), formulaires (un jeton par source). Tâches planifiées protégées par `CRON_SECRET`. Secrets comparés en temps constant.
- **Navigateur** : en-têtes de sécurité (HSTS, CSP partielle), liens et HTML des emails assainis, anti-rafale sur les formulaires publics.
- **Droits par membre** : chaque action vérifie côté serveur le droit du compte connecté (leads, formations, argent, WhatsApp, campagnes, contacts, réglages).

## Vérifier en une commande

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?select=id&limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Attendu : une erreur `42501` (permission refusée), jamais une liste.

## Si un secret fuit

| Secret | Où le changer |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY`, clé anon | Supabase → Project Settings → API → générer de nouvelles clés, puis mettre à jour Vercel |
| Mot de passe de la base (`DATABASE_URL`) | Supabase → Database → Settings → Reset password |
| `WHATSAPP_TOKEN` | Meta Business → System users → révoquer et regénérer |
| `WHATSAPP_APP_SECRET` | Meta → App settings → Basic → Reset |
| `RESEND_API_KEY` | Resend → API Keys → supprimer et recréer |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `CRON_SECRET`, `TUTOR_WEBHOOK_SECRET`, `WHATSAPP_VERIFY_TOKEN` | En générer un nouveau et le reporter partout où il est utilisé |
| `VAPID_PRIVATE_KEY` | Nouvelle paire de clés : chaque membre réactive ses notifications |

Après chaque changement dans Vercel : **redéployez**.
