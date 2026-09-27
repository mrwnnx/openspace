import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Les pièces jointes WhatsApp — dans les deux sens.
 *
 * Reçu : Meta ne donne qu'un identifiant de média ; l'URL de téléchargement
 * vit 5 minutes et le fichier 30 jours. On le rapatrie DONC à la réception
 * dans notre bucket `whatsapp-media`, sinon la photo ou le vocal du lead disparaît.
 *
 * Envoyé : le fichier est d'abord posé dans le même bucket, puis Meta le
 * récupère par une URL signée. Une seule copie, la nôtre, sert à l'affichage.
 *
 * Bucket PRIVÉ depuis l'audit du 26/09 : les leads y envoient reçus de
 * virement et pièces d'identité. L'affichage passe par des URL signées,
 * refaites à chaque lecture du fil (la colonne `url` n'est plus lue).
 */

const API = "https://graph.facebook.com/v21.0";
const BUCKET = "whatsapp-media";

export type MediaKind = "image" | "video" | "audio" | "document" | "sticker";

export const MEDIA_KINDS: MediaKind[] = ["image", "video", "audio", "document", "sticker"];

/** Ce qu'on accepte d'envoyer depuis le CRM, et jusqu'à quel poids. */
export const ENVOI_MAX_BYTES = 4 * 1024 * 1024; // le corps d'une action Vercel plafonne à 4,5 Mo
export type EnvoiKind = "image" | "video" | "document" | "audio";
export const ENVOI_MIME: Record<string, EnvoiKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "video/mp4": "video",
  "application/pdf": "document",
  // Un vocal enregistré dans le CRM : ogg/opus est LE format que WhatsApp
  // affiche comme un message vocal (et non comme un fichier audio).
  "audio/ogg": "audio",
};

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "application/pdf": "pdf",
};

function extension(mime: string | null, filename?: string | null): string {
  const base = mime?.split(";")[0].trim() ?? "";
  if (EXT[base]) return EXT[base];
  const fromName = filename?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromName || "bin";
}

export type Stocke = { url: string; storagePath: string; mimeType: string | null; size: number };

/** Pose des octets dans le bucket, sous `<leadId>/<uuid>.<ext>` ; rend l'URL publique. */
export async function stockerMedia(
  leadId: string,
  bytes: ArrayBuffer | Blob,
  mime: string | null,
  filename?: string | null
): Promise<{ ok: true; media: Stocke } | { ok: false; error: string }> {
  const s = storage();
  if (!s) return { ok: false, error: "Stockage non configuré (clé Supabase absente)." };
  const path = `${leadId}/${crypto.randomUUID()}.${extension(mime, filename)}`;
  const { error } = await s.upload(path, bytes, {
    contentType: mime ?? undefined,
    cacheControl: "31536000",
  });
  if (error) return { ok: false, error: error.message };
  const size = bytes instanceof Blob ? bytes.size : bytes.byteLength;
  // Assez long pour que Meta vienne chercher le fichier envoyé.
  const { data: signe, error: e2 } = await s.createSignedUrl(path, 24 * 3600);
  if (e2 || !signe) return { ok: false, error: e2?.message ?? "URL signée impossible." };
  return { ok: true, media: { url: signe.signedUrl, storagePath: path, mimeType: mime, size } };
}

/** Des URL signées pour afficher des médias du bucket privé (chemin → URL). */
export async function signerMedias(chemins: string[], secondes = 6 * 3600): Promise<Map<string, string>> {
  const s = storage();
  const carte = new Map<string, string>();
  if (!s || chemins.length === 0) return carte;
  const { data } = await s.createSignedUrls([...new Set(chemins)], secondes);
  for (const d of data ?? []) if (d.path && d.signedUrl) carte.set(d.path, d.signedUrl);
  return carte;
}

/**
 * Rapatrie un média reçu : identifiant Meta → URL éphémère → octets → bucket.
 * Deux appels chez Meta, tous deux avec le jeton — l'URL seule rend 403.
 */
export async function rapatrierMediaMeta(
  leadId: string,
  mediaId: string,
  filename?: string | null
): Promise<{ ok: true; media: Stocke } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "WHATSAPP_TOKEN absent." };
  try {
    const meta = await fetch(`${API}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const info = (await meta.json().catch(() => null)) as
      | { url?: string; mime_type?: string; error?: { message?: string } }
      | null;
    if (!meta.ok || !info?.url) return { ok: false, error: info?.error?.message ?? `HTTP ${meta.status}` };

    const fichier = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fichier.ok) return { ok: false, error: `Téléchargement refusé (HTTP ${fichier.status}).` };
    const bytes = await fichier.arrayBuffer();
    return stockerMedia(leadId, bytes, info.mime_type ?? fichier.headers.get("content-type"), filename);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de rapatriement." };
  }
}

/** Le libellé qui tient lieu de texte dans le fil et l'historique quand il n'y a pas de légende. */
export function libelleMedia(kind: MediaKind, filename?: string | null): string {
  switch (kind) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Vidéo";
    case "audio":
      return "🎤 Vocal";
    case "sticker":
      return "Sticker";
    case "document":
      return `📄 ${filename ?? "Document"}`;
  }
}
