"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveScene } from "@/lib/scene/persist";
import { KIND_LABELS, MATERIAL_SLOTS, type Scene, type SceneObject } from "@/lib/scene/schema";
import MaterialPicker from "./MaterialPicker";
import type { FolderRow, MaterialRow } from "./ProjectWorkspace";

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        step={step}
        className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-right text-xs outline-none focus:border-ink"
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function ObjectsPanel({
  projectId,
  scene,
  selectedId,
  onSelect,
  onScene,
  library,
  folders,
}: {
  projectId: string;
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onScene: (s: Scene) => void;
  library: MaterialRow[];
  folders: FolderRow[];
}) {
  const [picker, setPicker] = useState<{ objectId: string; slot: string } | { room: string; slot: "floorMaterial" | "wallMaterial" } | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Scene | null>(null);

  function commit(next: Scene, note: string) {
    onScene(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!pending.current) return;
      setSaving(true);
      try {
        const supabase = createClient();
        const normalized = await saveScene(supabase, projectId, pending.current, note);
        onScene(normalized);
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function updateObject(id: string, patch: Partial<SceneObject>) {
    const next = { ...scene, objects: scene.objects.map((o) => (o.id === id ? { ...o, ...patch, anchor: patch.position || patch.rotation !== undefined ? undefined : o.anchor } : o)) };
    commit(next, `Modifica manuale: ${id}`);
  }

  function removeObject(id: string) {
    commit({ ...scene, objects: scene.objects.filter((o) => o.id !== id) }, `Rimosso ${id}`);
    onSelect(null);
  }

  function pickMaterial(m: MaterialRow) {
    if (!picker) return;
    const matId = `lib_${m.id.slice(0, 8)}`;
    const materials = {
      ...scene.materials,
      [matId]: {
        id: matId,
        name: m.name,
        color: m.color ?? undefined,
        texturePath: m.albedo_path ?? undefined,
        normalPath: m.normal_path ?? undefined,
        widthCm: Number(m.width_cm),
        heightCm: Number(m.height_cm),
        roughness: Number(m.roughness),
        metalness: Number(m.metalness),
        libraryId: m.id,
      },
    };
    let next: Scene;
    if ("objectId" in picker) {
      next = {
        ...scene,
        materials,
        objects: scene.objects.map((o) => (o.id === picker.objectId ? { ...o, materials: { ...o.materials, [picker.slot]: matId } } : o)),
      };
    } else {
      next = { ...scene, materials, rooms: scene.rooms.map((r) => (r.id === picker.room ? { ...r, [picker.slot]: matId } : r)) };
    }
    setPicker(null);
    commit(next, `Materiale ${m.name}`);
  }

  const matName = (id?: string) => (id ? (scene.materials[id]?.name ?? id) : "—");
  const selected = scene.objects.find((o) => o.id === selectedId);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
        Stanze {saving && <span className="ml-2 normal-case tracking-normal">salvo…</span>}
      </div>
      {scene.rooms.map((r) => (
        <div key={r.id} className="mx-3 mb-2 rounded-xl border border-border p-3 text-xs">
          <p className="font-medium">{r.name}</p>
          <p className="text-muted">h {r.height} cm · {r.openings.length} aperture</p>
          <div className="mt-2 space-y-1">
            {(["floorMaterial", "wallMaterial"] as const).map((slot) => (
              <div key={slot} className="flex items-center justify-between gap-2">
                <span className="text-muted">{slot === "floorMaterial" ? "Pavimento" : "Pareti"}</span>
                <button className="btn py-0.5 text-xs" onClick={() => setPicker({ room: r.id, slot })}>
                  {matName(r[slot])}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="px-4 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Oggetti</div>
      {scene.objects.length === 0 && <p className="px-4 text-xs text-muted">Nessun oggetto nella scena.</p>}
      <ul className="mx-3 space-y-1 pb-3">
        {scene.objects.map((o) => (
          <li key={o.id}>
            <button
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                selectedId === o.id ? "bg-accent-soft" : "hover:bg-panel"
              }`}
              onClick={() => onSelect(selectedId === o.id ? null : o.id)}
            >
              <span className="truncate font-medium">{o.label}</span>
              <span className="text-muted">
                {KIND_LABELS[o.kind]} · {Math.round(o.size.w)}×{Math.round(o.size.d)}×{Math.round(o.size.h)}
              </span>
            </button>
            {selected?.id === o.id && (
              <div className="mx-1 mt-1 mb-2 space-y-3 rounded-xl border border-border p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <NumberField label="X (cm)" value={o.position.x} onChange={(v) => updateObject(o.id, { position: { ...o.position, x: v } })} />
                  <NumberField label="Y (cm)" value={o.position.y} onChange={(v) => updateObject(o.id, { position: { ...o.position, y: v } })} />
                  <NumberField label="Rotazione" value={o.rotation} step={15} onChange={(v) => updateObject(o.id, { rotation: v })} />
                  <NumberField label="Quota (cm)" value={o.position.z ?? 0} onChange={(v) => updateObject(o.id, { position: { ...o.position, z: v } })} />
                  <NumberField label="Largh." value={o.size.w} onChange={(v) => v > 0 && updateObject(o.id, { size: { ...o.size, w: v } })} />
                  <NumberField label="Prof." value={o.size.d} onChange={(v) => v > 0 && updateObject(o.id, { size: { ...o.size, d: v } })} />
                  <NumberField label="Altezza" value={o.size.h} onChange={(v) => v > 0 && updateObject(o.id, { size: { ...o.size, h: v } })} />
                </div>
                {MATERIAL_SLOTS[o.kind].length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Finiture</p>
                    {MATERIAL_SLOTS[o.kind].map((slot) => (
                      <div key={slot} className="flex items-center justify-between gap-2 text-xs">
                        <span className="capitalize text-muted">{slot}</span>
                        <button className="btn max-w-[60%] truncate py-0.5 text-xs" onClick={() => setPicker({ objectId: o.id, slot })}>
                          {matName(o.materials[slot])}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="flex items-center gap-1 text-xs text-danger hover:underline" onClick={() => removeObject(o.id)}>
                  <Trash2 size={12} /> Rimuovi dalla scena
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {Object.keys(scene.materials).length > 0 && (
        <>
          <div className="px-4 pt-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Materiali nella scena</div>
          <ul className="mx-3 mb-4 grid grid-cols-2 gap-1.5">
            {Object.values(scene.materials).map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs">
                <span className="h-5 w-5 shrink-0 rounded border border-border" style={{ background: m.color ?? "#ddd" }} />
                <span className="truncate">{m.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {picker && <MaterialPicker library={library} folders={folders} onPick={pickMaterial} onClose={() => setPicker(null)} />}
    </div>
  );
}
