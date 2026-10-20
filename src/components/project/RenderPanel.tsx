"use client";

import { useMemo, useState } from "react";
import { Camera, Download, Globe, Image as ImageIcon, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import type { ViewerHandle } from "@/components/viewer/SceneViewer";
import type { RenderRow } from "./ProjectWorkspace";

const MODE_LABEL: Record<string, string> = {
  preview: "Anteprima 3D",
  static: "Fotorealistico statico",
  pano: "Panorama 360°",
  full: "3D completo",
};

export default function RenderPanel({
  userId,
  projectId,
  viewer,
  initialRenders,
}: {
  userId: string;
  projectId: string;
  viewer: React.RefObject<ViewerHandle | null>;
  initialRenders: RenderRow[];
}) {
  const [renders, setRenders] = useState<RenderRow[]>(initialRenders);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paths = useMemo(() => renders.map((r) => r.image_path).filter((p): p is string => !!p), [renders]);
  const requests = useMemo(() => [{ bucket: "renders" as const, paths }], [paths]);
  const urls = useSignedUrls(requests);

  async function capturePreview() {
    const h = viewer.current;
    if (!h) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = h.capture(2);
      const blob = await (await fetch(dataUrl)).blob();
      const supabase = createClient();
      const id = crypto.randomUUID();
      const path = `${userId}/${projectId}/${id}.png`;
      const { error: upErr } = await supabase.storage.from("renders").upload(path, blob, { contentType: "image/png" });
      if (upErr) throw upErr;
      const { data, error: rowErr } = await supabase
        .from("renders")
        .insert({ id, project_id: projectId, owner_id: userId, mode: "preview", status: "done", camera: h.getCamera(), image_path: path, completed_at: new Date().toISOString() })
        .select("*")
        .single();
      if (rowErr) throw rowErr;
      setRenders((r) => [data, ...r]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setBusy(false);
    }
  }

  const modes = [
    {
      key: "preview",
      Icon: Camera,
      title: "Anteprima della vista",
      desc: "Salva l'inquadratura corrente del 3D ad alta risoluzione.",
      action: capturePreview,
      available: true,
    },
    {
      key: "static",
      Icon: ImageIcon,
      title: "Fotorealistico statico",
      desc: "Render fotorealistico dell'inquadratura corrente, vincolato alla geometria. In arrivo con la Fase 2.",
      available: false,
    },
    {
      key: "pano",
      Icon: Globe,
      title: "Panorama 360°",
      desc: "Render navigabile guardandosi intorno dal punto in cui ti trovi. Fase 3.",
      available: false,
    },
    {
      key: "full",
      Icon: Sparkles,
      title: "3D completo",
      desc: "Path tracing dell'intera scena, qualità fotografica navigabile. Fase 3.",
      available: false,
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-2 p-3">
        {modes.map(({ key, Icon, title, desc, action, available }) => (
          <div key={key} className={`rounded-xl border border-border p-3 ${available ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-panel p-2 text-ink">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              <button className="btn-primary text-xs" disabled={!available || busy} onClick={action}>
                {available ? (busy ? "…" : "Genera") : "Presto"}
              </button>
            </div>
          </div>
        ))}
        {error && <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-danger">{error}</p>}
      </div>
      <div className="px-4 pt-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Render del progetto</div>
      {renders.length === 0 && <p className="px-4 pb-4 text-xs text-muted">Ancora nessun render.</p>}
      <ul className="grid grid-cols-2 gap-2 px-3 pb-4">
        {renders.map((r) => {
          const url = r.image_path ? urls[r.image_path] : undefined;
          return (
            <li key={r.id} className="overflow-hidden rounded-xl border border-border">
              <div className="aspect-[4/3] bg-panel">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                <span className="truncate">{MODE_LABEL[r.mode] ?? r.mode}</span>
                {url && (
                  <a href={url} download className="text-muted hover:text-ink" title="Scarica">
                    <Download size={13} />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
