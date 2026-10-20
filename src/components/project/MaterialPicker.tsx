"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import type { FolderRow, MaterialRow } from "./ProjectWorkspace";

export function MaterialThumb({ url, color, className }: { url?: string; color?: string | null; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-md border border-border bg-panel ${className ?? "h-10 w-10"}`}
      style={{ background: color ?? undefined }}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

export default function MaterialPicker({
  library,
  folders,
  onPick,
  onClose,
}: {
  library: MaterialRow[];
  folders: FolderRow[];
  onPick: (m: MaterialRow) => void;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const paths = useMemo(() => library.map((m) => m.albedo_path).filter((p): p is string => !!p), [library]);
  const requests = useMemo(() => [{ bucket: "materials" as const, paths }], [paths]);
  const urls = useSignedUrls(requests);

  const items = library.filter(
    (m) => (folder === "all" || m.folder_id === folder) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Scegli dalla Materioteca</h2>
          <div className="flex-1" />
          <input className="input w-48" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-44" value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="all">Tutte le cartelle</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button className="btn-icon" onClick={onClose} aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
          {items.length === 0 && <p className="col-span-full text-sm text-muted">Nessuna finitura. Caricane nella Materioteca.</p>}
          {items.map((m) => (
            <button key={m.id} className="group text-left" onClick={() => onPick(m)}>
              <MaterialThumb url={m.albedo_path ? urls[m.albedo_path] : undefined} color={m.color} className="aspect-square w-full" />
              <p className="mt-1 truncate text-xs font-medium group-hover:text-accent">{m.name}</p>
              <p className="truncate text-[11px] text-muted">
                {m.supplier ? `${m.supplier} · ` : ""}
                {m.width_cm}×{m.height_cm} cm
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
