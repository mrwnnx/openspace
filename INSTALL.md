# Installer openspace

Durée : environ 30 minutes pour la base (sans les options). Vous n'écrivez aucune ligne de SQL.

## 1. Prérequis

- **Node.js 20 ou plus** (`node -v`) et **git**
- Un compte **[Supabase](https://supabase.com)** (gratuit pour démarrer)
- Un compte **[Vercel](https://vercel.com)** pour la mise en ligne (gratuit pour démarrer)

## 2. Créer le projet Supabase

1. Supabase → **New project**. Choisissez une région proche de vos utilisateurs et **notez-la** (elle servira à l'étape 8). Gardez le mot de passe de la base.
2. **Fermez l'inscription publique** : *Authentication → Sign In / Providers → Email* → décochez **« Allow new users to sign up »** → *Save*.
   Pourquoi : c'est le CRM qui crée les comptes (le premier, puis les invités). Si cette porte reste ouverte, n'importe qui peut se créer un compte avec la clé publique de votre projet.
3. Récupérez trois valeurs dans *Project Settings → API* (ou *API Keys*) :
   - l'**URL du projet** → `NEXT_PUBLIC_SUPABASE_URL`
   - la clé **anon / publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - la clé **service_role / secret** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secrète : ne la montrez à personne, ne la mettez jamais dans du code côté navigateur)
4. Récupérez l'adresse de la base : bouton **Connect** en haut → **Session pooler** → copiez l'URI (port **5432**) et remplacez `[YOUR-PASSWORD]` par le mot de passe de l'étape 1 → `DATABASE_URL`.
   ⚠️ N'utilisez pas le *Transaction pooler* (port 6543) : les pages deviendraient très lentes.

## 3. Récupérer le code et le configurer

```bash
git clone <adresse de ce dépôt>   # bouton « Code » → HTTPS sur GitHub
cd openspace
npm ci
cp .env.example .env.local
```

Ouvrez `.env.local` et remplissez la section **Obligatoire** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'URI du Session pooler (étape 2.4) |
| `NEXT_PUBLIC_SUPABASE_URL` | l'URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé service_role |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` pour l'instant |
| `CRON_SECRET` | une chaîne aléatoire : `openssl rand -hex 32` |

Pays : la Tunisie est réglée par défaut (fuseau `Africa/Tunis`, indicatif `216`, numéros à 8 chiffres). Pour un autre pays, changez les trois lignes « Pays » **avant** l'étape 4 : voir [docs/autre-pays.md](docs/autre-pays.md).

## 4. Créer la base de données

```bash
npm run installer-base
```

Résultat attendu :

```
✅ Tables créées et verrouillées.
✅ Espace justificatifs (privé)
✅ Espace whatsapp-media (privé)
✅ Espace email-assets (public)
✅ Espace avatars (public)
```

- **« La base contient déjà N table(s) »** : le script refuse de toucher une base qui n'est pas vide, et il n'a rien fait. Vérifiez que `DATABASE_URL` pointe bien vers le **nouveau** projet.
- **« Manque dans .env.local »** : complétez les variables citées.
- Le script travaille en tout-ou-rien : en cas d'erreur, la base reste vide et vous pouvez relancer.

## 5. Premier démarrage

```bash
npm run dev
```

Ouvrez **http://localhost:3000/login**.

## 6. Créer le compte propriétaire

Sur une installation neuve, `/login` affiche **« Bienvenue — créez le compte propriétaire »** : saisissez votre email et un mot de passe de **12 caractères minimum**, deux fois. Vous êtes connecté tout de suite, sans email de confirmation.

Ce compte a tous les droits. L'écran ne s'affiche **qu'une fois** : dès qu'un compte existe, il disparaît et l'inscription passe par invitation.

## 7. Régler l'école et l'équipe

- **Réglages → Votre école** : nom, description (ce que vous vendez, à qui) et langue des échanges. L'assistant IA, les emails et les pages publiques s'en servent.
- **Réglages → Équipe** : invitez vos collègues et choisissez leurs droits. L'invité reçoit un lien par email pour choisir son mot de passe : **il faut avoir configuré l'email** ([docs/email.md](docs/email.md)).

## 8. Mettre en ligne sur Vercel

1. Poussez votre copie du code sur votre propre GitHub, puis Vercel → **Add New → Project** → importez-la.
2. **Environment Variables** : collez toutes les variables de votre `.env.local`, en remplaçant `NEXT_PUBLIC_APP_URL` par l'adresse Vercel (par exemple `https://mon-crm.vercel.app`). Vous pourrez la corriger après le premier déploiement, puis redéployer.
3. **Région** : dans `vercel.json`, mettez dans `"regions"` la région Vercel la plus proche de votre base Supabase. Sinon, chaque page fait des allers-retours lointains.

   | Région Supabase | Région Vercel |
   |---|---|
   | eu-central-1 (Francfort), eu-central-2 (Zurich) | `fra1` |
   | eu-west-1 (Irlande), eu-west-2 (Londres) | `dub1` / `lhr1` |
   | eu-west-3 (Paris) | `cdg1` |
   | us-east-1 | `iad1` |
   | us-west-1 | `sfo1` |
   | ap-southeast-1 (Singapour) | `sin1` |

4. **Deploy**. Ouvrez l'adresse et connectez-vous avec le compte de l'étape 6 (la base est la même).

## 9. Tâches planifiées

Imports de formulaires, automatisations, campagnes programmées, résumé quotidien et relecture IA des leads tournent toutes les 15 minutes grâce à **GitHub Actions** (`.github/workflows/elementor-import.yml`), qui appelle votre CRM.

Dans votre dépôt GitHub → *Settings → Secrets and variables → Actions* :
- onglet **Variables** → `CRM_URL` = l'adresse de votre CRM (sans `/` final) ;
- onglet **Secrets** → `CRON_SECRET` = la même valeur que dans Vercel.

`vercel.json` déclare aussi une tâche quotidienne Vercel (import de formulaires à 6 h UTC), qui sert de secours.

## 10. Dépannage

| Symptôme | Cause et solution |
|---|---|
| `/login` : « Il manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY » | Variables absentes ou mal copiées dans `.env.local` (local) ou dans Vercel. En ligne, redéployez après les avoir ajoutées. |
| « Un propriétaire existe déjà » alors que vous n'avez pas de compte | Un compte a été créé dans Supabase (par vous, depuis le tableau de bord, ou lors d'un essai interrompu). *Supabase → SQL Editor* : `select email from auth.users;` Si c'est votre adresse, donnez-lui le rôle de propriétaire : `insert into allowed_emails (email, role, permissions) values ('votre@adresse', 'proprietaire', '{}');` puis utilisez « Oublié ? » sur `/login` pour choisir un mot de passe (email configuré requis), ou fixez-le dans *Authentication → Users*. |
| Pages très lentes (plusieurs secondes) | `DATABASE_URL` utilise le port 6543 : passez au **Session pooler (5432)**. En ligne : vérifiez la région Vercel (étape 8.3). |
| Le build Vercel échoue | Une variable obligatoire manque dans Vercel. Lisez la première erreur du journal de build. |
| Le lien d'invitation mène à une mauvaise adresse | `NEXT_PUBLIC_APP_URL` n'est pas l'adresse réelle du CRM. Corrigez-la et redéployez. |
| Les emails ne partent pas | `RESEND_API_KEY` absente, ou domaine non vérifié chez Resend. Voir [docs/email.md](docs/email.md). |
| WhatsApp ne reçoit rien | Webhook Meta non vérifié : `WHATSAPP_VERIFY_TOKEN` ou `WHATSAPP_APP_SECRET` erronés, ou mauvais abonnement. Voir [docs/whatsapp.md](docs/whatsapp.md). |
| WhatsApp « envoie » mais rien n'arrive | `WHATSAPP_SEND_MODE` vaut `dry_run` (rien ne part, c'est voulu) ou `allowlist`. Passez à `live` quand vous êtes prêt. |
| Pas de proposition de notifications dans « Mon profil » | Clés VAPID absentes. Voir [docs/notifications.md](docs/notifications.md). |
| Heures décalées | `NEXT_PUBLIC_APP_TIMEZONE` ne correspond pas à votre fuseau (format `Continent/Ville`, par exemple `Europe/Paris`). Redéployez après changement. |
| Numéros mal reconnus (doublons non détectés, indicatif en double) | Indicatif ou longueur de numéro inadaptés à votre pays. Voir [docs/autre-pays.md](docs/autre-pays.md). |
