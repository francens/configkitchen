"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PromptBar from "./PromptBar";
import { createClient } from "@/lib/supabase/client";
import { uploadAttachment } from "@/lib/uploads";
import { emptyScene } from "@/lib/scene/defaults";
import type { MessageBlock } from "@/lib/messages";
import type { Json } from "@/lib/supabase/types";

function projectNameFrom(text: string, files: File[]) {
  const base = text.replace(/\s+/g, " ").trim();
  if (base) return base.length > 48 ? base.slice(0, 45).trimEnd() + "…" : base;
  if (files[0]) return files[0].name.replace(/\.[^.]+$/, "");
  return "Nuovo progetto";
}

export default function NewProjectComposer() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(text: string, files: File[]) {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      setStatus("Creo il progetto…");
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({ owner_id: user.id, name: projectNameFrom(text, files), scene: emptyScene() as unknown as Json })
        .select("id")
        .single();
      if (pErr || !project) throw pErr ?? new Error("Progetto non creato");

      const blocks: MessageBlock[] = [];
      if (text) blocks.push({ type: "text", text });
      for (const f of files) {
        setStatus(`Carico ${f.name}…`);
        blocks.push(await uploadAttachment(supabase, user.id, project.id, f));
      }
      const { error: mErr } = await supabase
        .from("messages")
        .insert({ project_id: project.id, role: "user", content: blocks });
      if (mErr) throw mErr;

      router.push(`/p/${project.id}?run=1`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
      setStatus(null);
    }
  }

  return (
    <div>
      <PromptBar autoFocus onSubmit={handleSubmit} disabled={!!status} />
      {status && <p className="mt-2 text-center text-xs text-muted">{status}</p>}
      {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}
