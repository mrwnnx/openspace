# WordPress, Elementor et Tutor LMS

Trois branchements indépendants, tous facultatifs.

## Formulaires par webhook (Elementor, Tally ou tout outil qui envoie un POST JSON)

Chaque source a un jeton secret et est rattachée à une formation. Il n'y a pas encore d'écran pour en créer : une requête dans *Supabase → SQL Editor* suffit. Remplacez le nom de la formation et la correspondance des champs :

```sql
insert into form_sources (name, bootcamp_id, webhook_token, field_mapping)
select 'Formulaire du site', id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
       '{"email": "email", "nom": "fullName", "telephone": "mobileNo"}'::jsonb
from bootcamps where name = 'Formation par défaut'
returning webhook_token;
```

- L'adresse à coller dans l'action *Webhook* de votre formulaire : `https://VOTRE-CRM/api/webhook/forms/<webhook_token>`.
- `field_mapping` associe **le nom du champ de votre formulaire** à une colonne du lead. Colonnes acceptées : `email`, `fullName`, `firstName`, `lastName`, `mobileNo`, `phone`, `jobTitle`, `organizationName`, ainsi que `whatsapp`, `age`, `whatsappConsent`, `intendedPlan`, `promoCode`, `motivation` et `wantsCall`. Tout autre champ est ignoré.
- Chaque envoi crée ou complète un lead dans cette formation.

## Import des soumissions Elementor Pro (sans webhook)

Pour aspirer les soumissions déjà enregistrées par Elementor Pro :

1. `WP_SITE_URL=https://mon-ecole.com` : c'est le seul site auquel le CRM acceptera d'envoyer le mot de passe.
2. WordPress → *Utilisateurs → Profil* → **Mots de passe d'application** → créez-en un.
3. CRM → **Réglages → Site** : adresse du site, identifiant et mot de passe d'application.

L'import tourne avec les tâches planifiées (INSTALL.md, étape 9).

## Tutor LMS : une inscription au cours devient un lead

1. `TUTOR_WEBHOOK_SECRET` = une chaîne aléatoire (`openssl rand -hex 32`).
2. `TUTOR_ALUMNI_TAG` = le tag posé sur ces personnes (`Alumni` par défaut).
3. `TUTOR_ALUMNI_BOOTCAMP` (facultatif) = le début du nom d'une formation, souvent archivée, où ranger les nouveaux venus. Sans elle, ils restent hors kanban.
4. Sur WordPress (extrait PHP, par exemple avec *Code Snippets*) :

```php
add_action('tutor_after_enrolled', function ($course_id, $user_id) {
    $u = get_userdata($user_id);
    wp_remote_post('https://VOTRE-CRM/api/webhook/tutor-enrollment', [
        'headers' => ['Content-Type' => 'application/json', 'x-webhook-secret' => 'VOTRE_TUTOR_WEBHOOK_SECRET'],
        'body'    => wp_json_encode(['email' => $u->user_email, 'first_name' => $u->first_name, 'last_name' => $u->last_name]),
        'timeout' => 10,
    ]);
}, 10, 2);
```

Comme pour l'import CSV : jamais de doublon, le tag s'ajoute à un lead existant, et rien n'est écrasé.
