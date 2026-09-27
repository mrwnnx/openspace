import "server-only";
import { sql } from "drizzle-orm";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { db } from "@/db";

/**
 * Le tout premier compte d'une installation neuve devient propriétaire.
 * La porte ne s'ouvre que si la base n'a AUCUN compte ni AUCUNE invitation ;
 * ensuite elle est fermée pour toujours et l'inscription passe par invitation.
 */
export async function aucunCompte(): Promise<boolean> {
  const [r] = await db.execute<{ n: number }>(sql`
    select (select count(*) from auth.users)::int + (select count(*) from allowed_emails)::int as n`);
  return (r?.n ?? 1) === 0;
}

export type ResultatPremierCompte =
  | { ok: true }
  | { ok: false; erreur: "existe" | "invalide" | "config" | "echec" };

export async function creerProprietaire(emailBrut: string, motDePasse: string): Promise<ResultatPremierCompte> {
  const email = emailBrut.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || motDePasse.length < 12) {
    return { ok: false, erreur: "invalide" };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, erreur: "config" };
  const admin = createAdminClient(url, key, { auth: { persistSession: false } }).auth.admin;

  try {
    // Verrou transactionnel : deux onglets qui valident en même temps passent
    // l'un après l'autre, et le second trouve la place prise.
    return await db.transaction(async (tx): Promise<ResultatPremierCompte> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('openspace:premier-compte'))`);
      const [r] = await tx.execute<{ n: number }>(sql`
        select (select count(*) from auth.users)::int + (select count(*) from allowed_emails)::int as n`);
      if ((r?.n ?? 1) !== 0) return { ok: false, erreur: "existe" };
      await tx.execute(sql`
        insert into allowed_emails (email, note, role, permissions)
        values (${email}, 'Premier compte', 'proprietaire', '{}'::jsonb)`);
      const { error } = await admin.createUser({ email, password: motDePasse, email_confirm: true });
      if (error) throw new Error(error.message); // annule l'insert ci-dessus
      return { ok: true };
    });
  } catch (e) {
    console.error("Premier compte :", e);
    return { ok: false, erreur: "echec" };
  }
}
