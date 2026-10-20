import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { sampleScene } from "./defaults";

const USER_PROMPT =
  "Living di 620×450, altezza 270. Finestra sulla parete destra di 180 cm, porta sulla parete sinistra. Cucina lineare da 360 con una colonna a destra sulla parete in basso partendo dall'angolo sinistro, isola 200×90 a un metro dalla cucina, divano a tre posti lungo la parete destra, tavolo da pranzo 180×90 con quattro sedie, libreria da 180 sulla parete in alto. Ante Fenix grigio, piani in Calacatta, tavolo e isola in noce.";

const ASSISTANT_REPLY =
  "Ho costruito il living 620×450 cm (h 270) con finestra da 180 cm sulla parete est a 130 cm dall'angolo e porta da 90 cm sulla parete ovest.\n\nCucina lineare 360 cm con moduli 60-60-90-60-90, pensili e una colonna a destra, appoggiata alla parete sud dall'angolo sinistro. Isola 200×90 a 100 cm dalla cucina. Divano 240 cm sulla parete est, tavolo 180×90 con quattro sedie, libreria 180×35 sulla parete nord.\n\nIpotesi: altezza pensili 72 cm da 140 cm, davanzale finestra a 95 cm. Dimmi se vuoi spostare qualcosa o cambiare una finitura.";

/** Crea un progetto dimostrativo per chi entra per la prima volta, così il viewer non è vuoto. */
export async function ensureSampleProject(supabase: SupabaseClient<Database>, userId: string) {
  const { data: project } = await supabase
    .from("projects")
    .insert({ owner_id: userId, name: "Esempio: living con cucina", scene: sampleScene() as unknown as Json })
    .select("id")
    .single();
  if (!project) return;
  await supabase.from("messages").insert([
    { project_id: project.id, role: "user", content: [{ type: "text", text: USER_PROMPT }] },
    {
      project_id: project.id,
      role: "assistant",
      content: [
        { type: "text", text: ASSISTANT_REPLY },
        { type: "scene_update", summary: "scena di esempio" },
      ],
    },
  ]);
}
