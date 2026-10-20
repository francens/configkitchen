import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import type { AttachmentRef } from "./messages";

export function guessKind(file: File): string {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "plan";
  if (/\.(glb|gltf|obj|fbx|dae|3ds|skp)$/.test(name)) return "model";
  if (file.type.startsWith("image/")) return "photo";
  return "other";
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
}

/** Carica un file nel bucket attachments e registra la riga; restituisce il blocco da salvare nel messaggio. */
export async function uploadAttachment(
  supabase: SupabaseClient<Database>,
  userId: string,
  projectId: string,
  file: File,
): Promise<AttachmentRef> {
  const id = crypto.randomUUID();
  const path = `${userId}/${projectId}/${id}-${safeName(file.name)}`;
  const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upErr) throw upErr;
  const kind = guessKind(file);
  const { error: rowErr } = await supabase.from("attachments").insert({
    id,
    project_id: projectId,
    owner_id: userId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    kind,
  });
  if (rowErr) throw rowErr;
  return { type: "attachment", id, name: file.name, mime: file.type || null, path, kind };
}

/** Carica una texture nel bucket materials; restituisce il percorso. */
export async function uploadMaterialImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("materials").upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}
