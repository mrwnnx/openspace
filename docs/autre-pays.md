# Utiliser openspace hors de Tunisie

Trois variables décrivent votre pays :

| Variable | Tunisie (défaut) | Exemples |
|---|---|---|
| `NEXT_PUBLIC_APP_TIMEZONE` | `Africa/Tunis` | `Europe/Paris`, `Africa/Casablanca`, `Africa/Algiers` |
| `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE` | `216` | `33` (France), `212` (Maroc), `213` (Algérie) |
| `NEXT_PUBLIC_NATIONAL_NUMBER_LENGTH` | `8` | `9` (France, Maroc et Algérie, **sans** le 0 de tête) |

Règle du CRM : un numéro saisi avec exactement `NATIONAL_NUMBER_LENGTH` chiffres est national et reçoit l'indicatif ; avec un 0 de tête en plus (« 06 12 34 56 78 »), ce 0 est retiré avant. Un numéro qui commence par `00` perd ces deux zéros. Tout autre numéro est gardé tel quel (il doit déjà porter son indicatif).

**Avant l'installation** : réglez les trois variables, puis lancez `npm run installer-base`.

**Après l'installation** : changez les variables, redéployez, puis mettez à jour la fonction de la base (*Supabase → SQL Editor*), en remplaçant `9` et `33` par vos valeurs :

```sql
CREATE OR REPLACE FUNCTION numero_complet(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN d = '' THEN ''
    WHEN d LIKE '00%' THEN substr(d, 3)
    WHEN length(d) = 9 THEN '33' || d
    WHEN length(d) = 10 AND d LIKE '0%' THEN '33' || substr(d, 2)
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(t, ''), '\D', '', 'g') AS d) x
$$;
REINDEX INDEX leads_numero_complet_idx;
REINDEX INDEX contacts_numero_complet_idx;
```

La devise se règle **par formation** (TND par défaut).
