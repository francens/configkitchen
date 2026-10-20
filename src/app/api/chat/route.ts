import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SceneSchema, type Scene } from "@/lib/scene/schema";
import { normalizeScene } from "@/lib/scene/geometry";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import type { MessageBlock } from "@/lib/messages";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_INLINE_BYTES = 4.5 * 1024 * 1024;
/** solo gli ultimi N messaggi utente portano gli allegati in forma binaria */
const BINARY_WINDOW = 4;

type Event =
  | { type: "status"; text: string }
  | { type: "scene"; scene: Scene }
  | { type: "done"; text: string; scene: Scene | null; messageId: string | null }
  | { type: "error"; message: string };

export async function POST(request: Request) {
  const { projectId } = (await request.json().catch(() => ({}))) as { projectId?: string };
  if (!projectId) return Response.json({ error: "projectId mancante" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Chiave Anthropic non configurata sul server (ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return Response.json({ error: "Progetto non trovato" }, { status: 404 });

  const [{ data: rows }, { data: library }] = await Promise.all([
    supabase.from("messages").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from("materials").select("id,name,albedo_path,width_cm,height_cm,roughness,metalness,color,supplier,sku").eq("owner_id", user.id),
  ]);
  const history = rows ?? [];
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Nessun messaggio da elaborare" }, { status: 400 });
  }

  const parsed = SceneSchema.safeParse(project.scene);
  let currentScene: Scene = parsed.success ? parsed.data : SceneSchema.parse({});
  let sceneChanged = false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        send({ type: "status", text: "Leggo la richiesta e gli allegati…" });

        // --- conversazione per Claude
        const userIdx = history.map((m, i) => (m.role === "user" ? i : -1)).filter((i) => i >= 0);
        const binaryFrom = userIdx.length > BINARY_WINDOW ? userIdx[userIdx.length - BINARY_WINDOW] : 0;
        const messages: Anthropic.Beta.BetaMessageParam[] = [];
        for (let i = 0; i < history.length; i++) {
          const m = history[i];
          const blocks = (Array.isArray(m.content) ? m.content : []) as MessageBlock[];
          if (m.role === "assistant") {
            const text = blocks
              .map((b) => (b.type === "text" ? b.text : b.type === "scene_update" ? `[scena aggiornata: ${b.summary}]` : ""))
              .filter(Boolean)
              .join("\n");
            messages.push({ role: "assistant", content: text || "(nessun testo)" });
            continue;
          }
          const content: Anthropic.Beta.BetaContentBlockParam[] = [];
          for (const b of blocks) {
            if (b.type === "text") content.push({ type: "text", text: b.text });
            if (b.type === "attachment") {
              const mime = b.mime ?? "";
              const inline = i >= binaryFrom && (IMAGE_TYPES.has(mime) || mime === "application/pdf");
              if (inline) {
                const { data: blob } = await supabase.storage.from("attachments").download(b.path);
                if (blob && blob.size <= MAX_INLINE_BYTES) {
                  const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
                  if (mime === "application/pdf") {
                    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: b.name });
                  } else {
                    content.push({
                      type: "image",
                      source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data },
                    });
                  }
                  content.push({ type: "text", text: `[allegato: ${b.name} (${b.kind}), percorso ${b.path}]` });
                  continue;
                }
              }
              content.push({ type: "text", text: `[allegato: ${b.name} (${b.kind}, ${mime || "tipo sconosciuto"}), percorso ${b.path}]` });
            }
          }
          if (content.length === 0) content.push({ type: "text", text: "(messaggio vuoto)" });
          messages.push({ role: "user", content });
        }

        // --- contesto volatile: scena e materioteca
        const libText =
          library && library.length
            ? library
                .map(
                  (m) =>
                    `- id ${m.id} · "${m.name}"${m.supplier ? ` (${m.supplier}${m.sku ? ` ${m.sku}` : ""})` : ""} · ${m.width_cm}×${m.height_cm} cm · roughness ${m.roughness} · metalness ${m.metalness}${m.albedo_path ? ` · texturePath ${m.albedo_path}` : m.color ? ` · color ${m.color}` : ""}`,
                )
                .join("\n")
            : "(vuota)";
        const context = `## Materioteca dell'utente\n${libText}\n\n## Scena attuale del progetto "${project.name}"\n${JSON.stringify(currentScene)}`;

        const setScene = betaZodTool({
          name: "set_scene",
          description:
            "Salva la scena 3D completa del progetto (sostituisce quella attuale). Chiamalo ogni volta che la scena deve cambiare: nuova stanza, oggetto aggiunto/spostato, materiale cambiato. Passa SEMPRE l'intera scena, con gli id invariati per ciò che non cambia.",
          inputSchema: z.object({
            scene: SceneSchema,
            summary: z.string().describe("Riassunto in una frase di cosa è cambiato, in italiano"),
          }),
          run: async (input) => {
            const scene = normalizeScene(input.scene);
            const [{ error }] = await Promise.all([
              supabase.from("projects").update({ scene: scene as unknown as Json }).eq("id", projectId),
              supabase.from("project_versions").insert({ project_id: projectId, scene: scene as unknown as Json, note: input.summary }),
            ]);
            if (error) return `Errore nel salvataggio: ${error.message}`;
            currentScene = scene;
            sceneChanged = true;
            send({ type: "scene", scene });
            send({ type: "status", text: "Scena aggiornata, preparo la risposta…" });
            return `Scena salvata: ${scene.rooms.length} stanze, ${scene.objects.length} oggetti. ${input.summary}`;
          },
        });

        const client = new Anthropic();
        const runner = client.beta.messages.toolRunner({
          model: MODEL,
          max_tokens: 32000,
          stream: false,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "high" },
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
            { type: "text", text: context },
          ],
          tools: [setScene, { type: "web_search_20260209", name: "web_search", max_uses: 6 }],
          messages,
          max_iterations: 8,
        });

        send({ type: "status", text: "Analizzo misure e composizione…" });
        for await (const message of runner) {
          for (const block of message.content) {
            if (block.type === "server_tool_use") send({ type: "status", text: "Cerco informazioni sul web…" });
            if (block.type === "tool_use" && block.name === "set_scene") send({ type: "status", text: "Costruisco la scena 3D…" });
          }
          if (message.stop_reason === "pause_turn") {
            runner.pushMessages({ role: "assistant", content: message.content });
          }
        }
        const final = await runner.done();
        if (final.stop_reason === "refusal") {
          throw new Error("La richiesta non può essere elaborata (rifiuto del modello).");
        }
        const text = final.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();

        const blocks: MessageBlock[] = [];
        if (text) blocks.push({ type: "text", text });
        if (sceneChanged) blocks.push({ type: "scene_update", summary: "scena aggiornata" });
        if (blocks.length === 0) blocks.push({ type: "text", text: "Fatto." });
        const { data: saved } = await supabase
          .from("messages")
          .insert({ project_id: projectId, role: "assistant", content: blocks })
          .select("id")
          .single();

        send({ type: "done", text: text || "Fatto.", scene: sceneChanged ? currentScene : null, messageId: saved?.id ?? null });
      } catch (err) {
        let message = "Errore imprevisto";
        if (err instanceof Anthropic.AuthenticationError) message = "Chiave Anthropic non valida.";
        else if (err instanceof Anthropic.RateLimitError) message = "Limite di richieste raggiunto, riprova tra poco.";
        else if (err instanceof Anthropic.APIError) message = `Errore API (${err.status}): ${err.message}`;
        else if (err instanceof Error) message = err.message;
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
