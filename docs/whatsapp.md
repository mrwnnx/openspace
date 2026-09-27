# WhatsApp (API Cloud de Meta)

**Ce que ça apporte** : boîte de réception partagée (Messages), modèles, envois groupés par colonne du kanban, réponses de boutons, formulaire d'inscription, médias et notes vocales, assistant IA qui répond.

Il faut un numéro **dédié** : un numéro déjà utilisé dans l'application WhatsApp doit en être retiré avant.

## Étapes

1. [developers.facebook.com](https://developers.facebook.com) → **Create app** → type *Business* → ajoutez le produit **WhatsApp**.
2. **WhatsApp → API Setup** : ajoutez et vérifiez votre numéro. Notez :
   - *Phone number ID* → `WHATSAPP_PHONE_ID`
   - *WhatsApp Business Account ID* → `WHATSAPP_WABA_ID`
3. **Jeton permanent** : Business Settings → *System users* → créez un utilisateur système (Admin), donnez-lui l'application et le compte WhatsApp, puis **Generate token** avec les permissions `whatsapp_business_messaging` et `whatsapp_business_management` → `WHATSAPP_TOKEN`.
4. **App secret** : App settings → *Basic* → *App secret* → `WHATSAPP_APP_SECRET`. Le CRM refuse tout événement dont la signature ne correspond pas.
5. **Webhook** : WhatsApp → *Configuration* → *Edit* :
   - Callback URL : `https://VOTRE-CRM/api/webhook/whatsapp`
   - Verify token : une chaîne que vous inventez, identique à `WHATSAPP_VERIFY_TOKEN`
   - Abonnez les champs **messages** et **message_template_status_update**.
6. **Mode d'envoi** (`WHATSAPP_SEND_MODE`) :
   - `dry_run` : rien ne part, le message est seulement enregistré (idéal pour tester) ;
   - `allowlist` : seuls les numéros de `WHATSAPP_TEST_ALLOWLIST` reçoivent ;
   - `live` : tout part.

## Modèles

Hors de la fenêtre de 24 h qui suit le dernier message de la personne, Meta n'autorise que des **modèles** approuvés. Créez-les dans Réglages → WhatsApp → **Modèles de message** (l'IA relit votre texte et prédit l'avis de Meta) ou dans le Gestionnaire WhatsApp.

Rappels d'échéance : créez un modèle nommé **`echeance_rappel`** avec trois variables (prénom, montant, date). Le CRM l'utilise dès qu'il est approuvé, dans la langue du modèle.

## Formulaire d'inscription (facultatif)

`docs/whatsapp-flow-exemple.json` est un formulaire WhatsApp (Meta Flow) prêt à publier : il ne demande que ce qui manque (email, âge, situation, formule de paiement) et affiche les prix de la formation.

1. Gestionnaire WhatsApp → **Flows → Create** → collez le JSON (adaptez les textes si besoin, **sans changer** les valeurs de « situation », que le CRM reconnaît) → **Publish**.
2. Copiez l'identifiant du Flow dans `WHATSAPP_FLOW_INSCRIPTION_ID`.

Sans cet identifiant, l'assistant répond simplement en texte à qui veut s'inscrire.
