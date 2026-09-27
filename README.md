# openspace

**CRM open source pour écoles de formation et vendeurs de produits digitaux** : leads, pipeline par formation, paiements en plusieurs fois, WhatsApp, emails et assistant IA.

Il est pensé pour une équipe qui vend des formations par sessions (ou des produits vendus par lancements). Des personnes arrivent par un formulaire ou par WhatsApp ; on les appelle, on les relance, puis on encaisse, souvent en plusieurs fois.

> **Statut.** Première publication le 27/09/2026. La procédure d'installation n'a pas encore été suivie par un tiers : vos retours sont bienvenus ([issues](../../issues)).

## Ce que fait le CRM

- **Formations et pipeline** : chaque formation (ou produit) a son propre kanban (Nouveau → Contacté → Intéressé → Inscrit / Perdu), avec des colonnes modifiables. Une formation sans date ni nombre de places convient à un produit vendu en continu.
- **Leads** : fiche complète, historique, doublons signalés, tags, température, import CSV, formulaires (Elementor, Tally ou tout webhook).
- **Ma journée** : les messages WhatsApp à traiter, les tâches du jour et les appels à passer.
- **Paiements** : prix total ou échéancier mensuel, encaissements (espèces, virement, chèque), justificatifs, échéances à venir et en retard, rappels automatiques.
- **WhatsApp** (API Cloud de Meta) : boîte de réception partagée, modèles, envois groupés par colonne, réponses de boutons, formulaire d'inscription, médias et notes vocales.
- **Emails** (Resend) : modèles, campagnes, désabonnement en un clic, habillage, statistiques.
- **Automatisations** : un envoi quand un lead entre dans une colonne (tout de suite, ou « J+n à telle heure »).
- **Assistant IA** (Anthropic) : il répond aux questions sur vos données, lit chaque lead (intention, frein, prochaine action) et peut rédiger ou envoyer les réponses WhatsApp, en mode répétition ou automatique.
- **Codes promo**, **statistiques** de conversion, **notifications** sur téléphone, **équipe** avec droits par domaine.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Drizzle ORM, Supabase (Postgres, Auth, Storage), Vercel.

## Installer

→ **[INSTALL.md](INSTALL.md)**, pas à pas : Supabase, variables, base de données, premier compte, mise en ligne.

Options, chacune dans sa page : [email](docs/email.md) · [WhatsApp](docs/whatsapp.md) · [assistant IA](docs/ia.md) · [notifications](docs/notifications.md) · [WordPress / Elementor / Tutor](docs/wordpress.md) · [autre pays que la Tunisie](docs/autre-pays.md).

Sécurité : [SECURITY.md](SECURITY.md).

## Licence

[AGPL-3.0](LICENSE). Vous pouvez utiliser, modifier et héberger openspace librement. Si vous proposez une version modifiée à d'autres personnes via Internet, vous devez publier vos modifications sous la même licence.
