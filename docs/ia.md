# Assistant IA (Anthropic)

**Ce que ça apporte** :
- un **assistant** qui répond aux questions sur vos données (« qui dois-je rappeler aujourd'hui ? ») ;
- une **lecture de chaque lead** : intention, frein, prochaine action, température ;
- des **conseils** sur vos statistiques ;
- la **relecture de vos modèles WhatsApp** avant de les soumettre à Meta ;
- un **assistant WhatsApp** qui rédige (et peut envoyer) les réponses aux prospects.

## Étapes

1. Créez une clé sur [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.
2. `ANTHROPIC_WORKSPACE_ID` (facultatif) : pour ranger la consommation dans un espace de travail précis.
3. **Réglages → Votre école** : nom, description et langue. C'est ce que l'IA dit de vous, et la langue dans laquelle elle écrit.

## L'assistant WhatsApp

Réglages → WhatsApp → **Assistant WhatsApp** :
- **Éteint** ;
- **Répétition** : il rédige une proposition sous chaque message reçu, sans rien envoyer. Vous comparez avec vos propres réponses ;
- **Testeurs** : les numéros listés reçoivent ses réponses pour de vrai, même en répétition (pratique pour l'essayer depuis votre téléphone).

Il ne répond qu'avec ce qu'on lui a donné (Réglages → WhatsApp → Assistant WhatsApp → **Son savoir** : textes, PDF, liens) et ce que contient la fiche du lead. Sous le seuil de confiance, il passe la main à l'équipe. Deux plafonds (par numéro et par jour) limitent la dépense.

## Coût

Chaque message traité par l'assistant WhatsApp coûte deux appels (rédaction, puis contrôle). Suivez la consommation dans la console Anthropic et commencez en mode Répétition.
