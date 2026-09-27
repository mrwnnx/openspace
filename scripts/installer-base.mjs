// npm run installer-base — crée la base d'une installation NEUVE.
// Lit .env.local : DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// NEXT_PUBLIC_DEFAULT_COUNTRY_CODE (216 par défaut), NEXT_PUBLIC_NATIONAL_NUMBER_LENGTH (8).
import { readFileSync, existsSync } from "node:fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const i = l.indexOf("=");
    if (i > 0 && !l.trimStart().startsWith("#")) {
      process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^"|"$/g, "");
    }
  }
}
const manque = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
if (manque.length) {
  console.error(`❌ Manque dans .env.local : ${manque.join(", ")}`);
  process.exit(1);
}

const code = (process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "216").replace(/\D/g, "");
const longueur = Number(process.env.NEXT_PUBLIC_NATIONAL_NUMBER_LENGTH || "8");
if (!code || !Number.isInteger(longueur) || longueur < 4 || longueur > 15) {
  console.error("❌ Indicatif (NEXT_PUBLIC_DEFAULT_COUNTRY_CODE) ou longueur (NEXT_PUBLIC_NATIONAL_NUMBER_LENGTH) invalide.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  // Garde-fou : jamais sur une base qui contient déjà quelque chose.
  const [{ n }] = await sql`select count(*)::int as n from pg_tables where schemaname = 'public'`;
  if (n > 0) {
    console.error(`❌ La base contient déjà ${n} table(s). Rien n'a été fait : ce script ne sert qu'à une base NEUVE.`);
    process.exit(1);
  }
  const base = readFileSync(new URL("../db/base.sql", import.meta.url), "utf8")
    .replaceAll("__DEFAULT_COUNTRY_CODE__", code)
    .replaceAll("__NATIONAL_NUMBER_LENGTH__", String(longueur));
  // Tout ou rien : une erreur au milieu laisse la base vide, pas à moitié créée.
  await sql.begin((tx) => tx.unsafe(base));
  console.log("✅ Tables créées et verrouillées.");
} finally {
  await sql.end();
}

// Les espaces de fichiers. Privés (liens signés) : justificatifs de paiement et
// médias WhatsApp. Publics par nécessité : les images insérées dans les emails
// (lues par la boîte mail du destinataire) et les photos de profil de l'équipe.
const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
}).storage;
for (const [b, estPublic] of [["justificatifs", false], ["whatsapp-media", false], ["email-assets", true], ["avatars", true]]) {
  const { error } = await storage.createBucket(b, { public: estPublic });
  const genre = estPublic ? "public" : "privé";
  console.log(error && !/already exists/i.test(error.message) ? `⚠️  Espace ${b} : ${error.message}` : `✅ Espace ${b} (${genre})`);
}
console.log("\nÉtape suivante : npm run dev, puis ouvrez /login pour créer le compte propriétaire.");
