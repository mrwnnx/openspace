import { NextRequest, NextResponse } from "next/server";
import { secretEgal } from "@/lib/secret-egal";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bootcamps } from "@/db/schema";
import { sql } from "drizzle-orm";
import { importLeads } from "@/lib/import-csv";
import { TUTOR_ALUMNI_BOOTCAMP, TUTOR_ALUMNI_TAG } from "@/lib/config";

export const maxDuration = 30;

// Inscription effective à un cours Tutor LMS (hook `tutor_after_enrolled`, relayé par un extrait PHP,
// cf. docs/wordpress.md) → la personne entre dans le CRM avec le tag TUTOR_ALUMNI_TAG, selon les règles de
// l'import CSV : jamais de doublon, tag ajouté à un lead existant, cases vides complétées, rien d'écrasé.
export async function POST(request: NextRequest) {
  const secret = process.env.TUTOR_WEBHOOK_SECRET;
  if (!secret || !secretEgal(request.headers.get("x-webhook-secret"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown; first_name?: unknown; last_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Un inconnu du CRM atterrit dans la formation des anciens (TUTOR_ALUMNI_BOOTCAMP, début du nom),
  // volontairement archivée pour ne pas encombrer les formations actives. Sans elle, il reste hors kanban.
  const anciens = TUTOR_ALUMNI_BOOTCAMP
    ? await db.query.bootcamps.findFirst({
        where: sql`${bootcamps.name} ilike ${TUTOR_ALUMNI_BOOTCAMP.replace(/[%_\\]/g, "\\$&") + "%"}`,
      })
    : null;

  const res = await importLeads(
    [{ email, first_name: str(body.first_name), last_name: str(body.last_name) }],
    { email: "email", first_name: "firstName", last_name: "lastName" },
    { newTagName: TUTOR_ALUMNI_TAG, bootcampId: anciens?.id ?? null }
  );
  revalidatePath("/leads");
  return NextResponse.json(res, { status: res.errors > 0 ? 500 : 200 });
}
