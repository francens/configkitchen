import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { Scene } from "./schema";
import { normalizeScene } from "./geometry";

export async function saveScene(supabase: SupabaseClient<Database>, projectId: string, scene: Scene, note: string) {
  const normalized = normalizeScene(scene);
  const { error } = await supabase.from("projects").update({ scene: normalized as unknown as Json }).eq("id", projectId);
  if (error) throw error;
  await supabase.from("project_versions").insert({ project_id: projectId, scene: normalized as unknown as Json, note });
  return normalized;
}
