"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import PromptBar from "@/components/PromptBar";
import { createClient } from "@/lib/supabase/client";
import { uploadAttachment } from "@/lib/uploads";
import type { ChatMessage, MessageBlock } from "@/lib/messages";
import type { Scene } from "@/lib/scene/schema";

type StreamEvent =
  | { type: "status"; text: string }
  | { type: "scene"; scene: Scene }
  | { type: "done"; text: string; scene: Scene | null; messageId: string | null }
  | { type: "error"; message: string };

export default function ChatPanel({
  userId,
  projectId,
  initialMessages,
  autoRun,
  onScene,
}: {
  userId: string;
  projectId: string;
  initialMessages: ChatMessage[];
  autoRun: boolean;
  onScene: (scene: Scene) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function runAssistant() {
    setError(null);
    setStatus("Penso…");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Errore ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as StreamEvent;
          if (ev.type === "status") setStatus(ev.text);
          if (ev.type === "scene") onScene(ev.scene);
          if (ev.type === "error") throw new Error(ev.message);
          if (ev.type === "done") {
            if (ev.scene) onScene(ev.scene);
            setMessages((m) => [
              ...m,
              {
                id: ev.messageId ?? crypto.randomUUID(),
                role: "assistant",
                content: [{ type: "text", text: ev.text }],
                created_at: new Date().toISOString(),
              },
            ]);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setStatus(null);
    }
  }

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!autoRun || last?.role !== "user" || started.current) return;
    const t = setTimeout(() => {
      started.current = true;
      runAssistant();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string, files: File[]) {
    setError(null);
    const supabase = createClient();
    const blocks: MessageBlock[] = [];
    if (text) blocks.push({ type: "text", text });
    try {
      for (const f of files) {
        setStatus(`Carico ${f.name}…`);
        blocks.push(await uploadAttachment(supabase, userId, projectId, f));
      }
      const { data, error: mErr } = await supabase
        .from("messages")
        .insert({ project_id: projectId, role: "user", content: blocks })
        .select("id,created_at")
        .single();
      if (mErr) throw mErr;
      setMessages((m) => [...m, { id: data.id, role: "user", content: blocks, created_at: data.created_at }]);
      await runAssistant();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setStatus(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">Descrivi cosa vuoi realizzare oppure allega una piantina.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-panel" : "bg-transparent"
              }`}
            >
              {m.role === "assistant" && (
                <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-accent">
                  <Sparkles size={12} /> Assistente
                </span>
              )}
              {m.content.map((b, i) => {
                if (b.type === "text") return <p key={i}>{b.text}</p>;
                if (b.type === "attachment")
                  return (
                    <span key={i} className="mt-1 mr-1 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
                      {b.mime?.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
                      {b.name}
                    </span>
                  );
                if (b.type === "scene_update")
                  return (
                    <span key={i} className="mt-1 block text-xs text-muted">
                      Scena 3D aggiornata
                    </span>
                  );
                return null;
              })}
            </div>
          </div>
        ))}
        {status && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> {status}
          </div>
        )}
        {error && <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-danger">{error}</p>}
        <div ref={bottom} />
      </div>
      <div className="border-t border-border p-3">
        <PromptBar compact placeholder="Correggi o aggiungi: «sposta l'isola a 1 m dalla cucina»…" onSubmit={send} disabled={!!status} />
      </div>
    </div>
  );
}
