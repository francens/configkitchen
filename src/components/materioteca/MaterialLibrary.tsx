"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FolderPlus, Folder, Pencil, Trash2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadMaterialImage } from "@/lib/uploads";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import type { Tables } from "@/lib/supabase/types";
import { MaterialThumb } from "@/components/project/MaterialPicker";

type Folder = Tables<"material_folders">;
type Material = Tables<"materials">;

function FolderNode({
  folder,
  all,
  depth,
  selected,
  onSelect,
}: {
  folder: Folder;
  all: Folder[];
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const children = all.filter((f) => f.parent_id === folder.id);
  return (
    <div>
      <button
        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm ${
          selected === folder.id ? "bg-surface shadow-sm" : "text-muted hover:bg-surface/60 hover:text-ink"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(folder.id)}
      >
        {children.length > 0 ? <ChevronRight size={12} className="shrink-0" /> : <span className="w-3" />}
        <Folder size={14} className="shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {children.map((c) => (
        <FolderNode key={c.id} folder={c} all={all} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function MaterialLibrary({
  userId,
  initialFolders,
  initialMaterials,
}: {
  userId: string;
  initialFolders: Folder[];
  initialMaterials: Material[];
}) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [selected, setSelected] = useState<string | null>(null);
  const [upload, setUpload] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paths = useMemo(() => materials.map((m) => m.albedo_path).filter((p): p is string => !!p), [materials]);
  const requests = useMemo(() => [{ bucket: "materials" as const, paths }], [paths]);
  const urls = useSignedUrls(requests);

  const visible = selected ? materials.filter((m) => m.folder_id === selected) : materials;
  const current = folders.find((f) => f.id === selected) ?? null;
  const breadcrumb: Folder[] = [];
  for (let f = current; f; f = folders.find((x) => x.id === f!.parent_id) ?? null) breadcrumb.unshift(f);

  async function newFolder() {
    const name = prompt("Nome della cartella (es. Marazzi, Pavimenti, Carte da parati)");
    if (!name?.trim()) return;
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("material_folders")
      .insert({ owner_id: userId, parent_id: selected, name: name.trim() })
      .select("*")
      .single();
    if (e) return setError(e.message);
    setFolders((f) => [...f, data]);
  }

  async function renameFolder() {
    if (!current) return;
    const name = prompt("Nuovo nome", current.name);
    if (!name?.trim()) return;
    const supabase = createClient();
    await supabase.from("material_folders").update({ name: name.trim() }).eq("id", current.id);
    setFolders((f) => f.map((x) => (x.id === current.id ? { ...x, name: name.trim() } : x)));
  }

  async function deleteFolder() {
    if (!current) return;
    if (!confirm(`Eliminare la cartella "${current.name}" e le sottocartelle? Le finiture restano senza cartella.`)) return;
    const supabase = createClient();
    await supabase.from("material_folders").delete().eq("id", current.id);
    const ids = new Set<string>();
    const collect = (id: string) => {
      ids.add(id);
      folders.filter((f) => f.parent_id === id).forEach((c) => collect(c.id));
    };
    collect(current.id);
    setFolders((f) => f.filter((x) => !ids.has(x.id)));
    setMaterials((m) => m.map((x) => (x.folder_id && ids.has(x.folder_id) ? { ...x, folder_id: null } : x)));
    setSelected(current.parent_id);
  }

  async function deleteMaterial(m: Material) {
    if (!confirm(`Eliminare "${m.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("materials").delete().eq("id", m.id);
    if (m.albedo_path) await supabase.storage.from("materials").remove([m.albedo_path]);
    setMaterials((ms) => ms.filter((x) => x.id !== m.id));
    setEditing(null);
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel/50">
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <h2 className="text-sm font-semibold">Materioteca</h2>
          <button className="btn-icon h-8 w-8" onClick={newFolder} title="Nuova cartella">
            <FolderPlus size={16} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          <button
            className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm ${
              selected === null ? "bg-surface shadow-sm" : "text-muted hover:bg-surface/60 hover:text-ink"
            }`}
            onClick={() => setSelected(null)}
          >
            <span className="w-3" /> Tutte le finiture
          </button>
          {folders
            .filter((f) => !f.parent_id)
            .map((f) => (
              <FolderNode key={f.id} folder={f} all={folders} depth={0} selected={selected} onSelect={setSelected} />
            ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className="min-w-0 flex-1 truncate text-sm">
            {breadcrumb.length === 0 ? (
              <span className="font-medium">Tutte le finiture</span>
            ) : (
              breadcrumb.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && <span className="text-muted"> / </span>}
                  <span className={i === breadcrumb.length - 1 ? "font-medium" : "text-muted"}>{f.name}</span>
                </span>
              ))
            )}
            <span className="ml-2 text-xs text-muted">{visible.length} finiture</span>
          </div>
          {current && (
            <>
              <button className="btn-icon h-8 w-8" onClick={renameFolder} title="Rinomina cartella">
                <Pencil size={14} />
              </button>
              <button className="btn-icon h-8 w-8" onClick={deleteFolder} title="Elimina cartella">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button className="btn-primary text-xs" onClick={() => setUpload(true)}>
            <Upload size={14} /> Carica finitura
          </button>
        </header>
        {error && <p className="m-4 rounded-lg bg-accent-soft px-3 py-2 text-xs text-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-4 overflow-y-auto p-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {visible.length === 0 && (
            <p className="col-span-full text-sm text-muted">
              Nessuna finitura qui. Carica una texture (foto o campione) e indica la sua dimensione reale in cm.
            </p>
          )}
          {visible.map((m) => (
            <button key={m.id} className="group text-left" onClick={() => setEditing(m)}>
              <MaterialThumb url={m.albedo_path ? urls[m.albedo_path] : undefined} color={m.color} className="aspect-square w-full" />
              <p className="mt-1.5 truncate text-sm font-medium group-hover:text-accent">{m.name}</p>
              <p className="truncate text-xs text-muted">
                {m.supplier ? `${m.supplier} · ` : ""}
                {m.width_cm}×{m.height_cm} cm
              </p>
            </button>
          ))}
        </div>
      </section>

      {(upload || editing) && (
        <MaterialDialog
          userId={userId}
          folders={folders}
          defaultFolder={selected}
          material={editing}
          onClose={() => {
            setUpload(false);
            setEditing(null);
          }}
          onSaved={(m) => {
            setMaterials((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [m, ...ms]));
            setUpload(false);
            setEditing(null);
          }}
          onDelete={deleteMaterial}
        />
      )}
    </div>
  );
}

function MaterialDialog({
  userId,
  folders,
  defaultFolder,
  material,
  onClose,
  onSaved,
  onDelete,
}: {
  userId: string;
  folders: Folder[];
  defaultFolder: string | null;
  material: Material | null;
  onClose: () => void;
  onSaved: (m: Material) => void;
  onDelete: (m: Material) => void;
}) {
  const [name, setName] = useState(material?.name ?? "");
  const [folder, setFolder] = useState<string>(material?.folder_id ?? defaultFolder ?? "");
  const [width, setWidth] = useState(String(material?.width_cm ?? 60));
  const [height, setHeight] = useState(String(material?.height_cm ?? 60));
  const [roughness, setRoughness] = useState(Number(material?.roughness ?? 0.6));
  const [metalness, setMetalness] = useState(Number(material?.metalness ?? 0));
  const [color, setColor] = useState(material?.color ?? "#cccccc");
  const [supplier, setSupplier] = useState(material?.supplier ?? "");
  const [sku, setSku] = useState(material?.sku ?? "");
  const [notes, setNotes] = useState(material?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function save() {
    if (!name.trim()) return setError("Dai un nome alla finitura.");
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      let albedo_path = material?.albedo_path ?? null;
      if (file) albedo_path = await uploadMaterialImage(supabase, userId, file);
      const row = {
        owner_id: userId,
        folder_id: folder || null,
        name: name.trim(),
        albedo_path,
        color: albedo_path ? null : color,
        width_cm: Number(width) || 100,
        height_cm: Number(height) || 100,
        roughness,
        metalness,
        supplier: supplier || null,
        sku: sku || null,
        notes: notes || null,
      };
      const q = material
        ? supabase.from("materials").update(row).eq("id", material.id).select("*").single()
        : supabase.from("materials").insert(row).select("*").single();
      const { data, error: e } = await q;
      if (e) throw e;
      onSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{material ? "Modifica finitura" : "Nuova finitura"}</h2>
          <button className="btn-icon h-8 w-8" onClick={onClose} aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <label className="block cursor-pointer">
            <div className="aspect-square w-full overflow-hidden rounded-xl border border-dashed border-border bg-panel">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-xs text-muted">
                  <Upload size={16} /> Texture o foto
                </div>
              )}
            </div>
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="space-y-2">
            <input className="input" placeholder="Nome (es. Rovere naturale)" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">Senza cartella</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">
                Larghezza reale (cm)
                <input className="input mt-1" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
              </label>
              <label className="text-xs text-muted">
                Altezza reale (cm)
                <input className="input mt-1" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Azienda" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              <input className="input" placeholder="Codice articolo" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted">
          <label>
            Opacità superficie {roughness.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={roughness} onChange={(e) => setRoughness(Number(e.target.value))} className="w-full" />
          </label>
          <label>
            Metallico {metalness.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={metalness} onChange={(e) => setMetalness(Number(e.target.value))} className="w-full" />
          </label>
          {!file && !material?.albedo_path && (
            <label>
              Colore (senza texture)
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block h-8 w-full" />
            </label>
          )}
        </div>
        <textarea className="input mt-3" rows={2} placeholder="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-4 flex items-center gap-2">
          {material && (
            <button className="text-xs text-danger hover:underline" onClick={() => onDelete(material)}>
              Elimina
            </button>
          )}
          <div className="flex-1" />
          <button className="btn" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "Salvo…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
