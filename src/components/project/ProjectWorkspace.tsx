"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Box, Camera, Eye, Footprints, Layers, MessageSquare, Ruler, Sparkles } from "lucide-react";
import type { Scene } from "@/lib/scene/schema";
import type { ChatMessage } from "@/lib/messages";
import type { Tables } from "@/lib/supabase/types";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import type { ViewerHandle } from "@/components/viewer/SceneViewer";
import ChatPanel from "./ChatPanel";
import ObjectsPanel from "./ObjectsPanel";
import RenderPanel from "./RenderPanel";

const SceneViewer = dynamic(() => import("@/components/viewer/SceneViewer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Carico il viewer 3D…</div>,
});

export type MaterialRow = Tables<"materials">;
export type FolderRow = Tables<"material_folders">;
export type RenderRow = Tables<"renders">;

type Tab = "chat" | "objects" | "render";

export default function ProjectWorkspace({
  userId,
  project,
  initialScene,
  initialMessages,
  library,
  folders,
  initialRenders,
  autoRun,
}: {
  userId: string;
  project: { id: string; name: string };
  initialScene: Scene;
  initialMessages: ChatMessage[];
  library: MaterialRow[];
  folders: FolderRow[];
  initialRenders: RenderRow[];
  autoRun: boolean;
}) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [showDimensions, setShowDimensions] = useState(false);
  const [walkMode, setWalkMode] = useState(false);
  const viewer = useRef<ViewerHandle | null>(null);

  const texturePaths = useMemo(
    () => Object.values(scene.materials).map((m) => m.texturePath).filter((p): p is string => !!p),
    [scene.materials],
  );
  const modelPaths = useMemo(
    () => scene.objects.map((o) => (typeof o.params.path === "string" ? o.params.path : "")).filter(Boolean),
    [scene.objects],
  );
  const requests = useMemo(
    () => [
      { bucket: "materials" as const, paths: texturePaths },
      { bucket: "attachments" as const, paths: modelPaths },
    ],
    [texturePaths, modelPaths],
  );
  const assetUrls = useSignedUrls(requests);

  const tabs: { id: Tab; label: string; Icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Chat", Icon: MessageSquare },
    { id: "objects", label: "Oggetti", Icon: Layers },
    { id: "render", label: "Render", Icon: Sparkles },
  ];

  return (
    <div className="flex h-full">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-bg/80 px-4 py-2 backdrop-blur">
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</h1>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button className="rounded-md px-2 py-1 hover:bg-panel" onClick={() => viewer.current?.setView("persp")} title="Prospettiva">
              <Box size={14} />
            </button>
            <button className="rounded-md px-2 py-1 hover:bg-panel" onClick={() => viewer.current?.setView("top")} title="Dall'alto">
              <Camera size={14} />
            </button>
            <button className="rounded-md px-2 py-1 hover:bg-panel" onClick={() => viewer.current?.setView("eye")} title="Altezza occhi">
              <Eye size={14} />
            </button>
          </div>
          <button
            className={`btn text-xs ${walkMode ? "bg-accent-soft" : ""}`}
            onClick={() => setWalkMode(!walkMode)}
            title="Cammina nella stanza: clic sul 3D, poi W A S D e mouse. Esc per uscire."
          >
            <Footprints size={14} /> Cammina
          </button>
          <button className={`btn text-xs ${showDimensions ? "bg-accent-soft" : ""}`} onClick={() => setShowDimensions(!showDimensions)}>
            <Ruler size={14} /> Misure
          </button>
        </header>
        <div className="relative min-h-0 flex-1">
          <SceneViewer
            scene={scene}
            assetUrls={assetUrls}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showDimensions={showDimensions}
            walkMode={walkMode}
            handleRef={viewer}
          />
          {scene.rooms.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
              <p className="rounded-full bg-surface/90 px-4 py-2 text-xs text-muted shadow">
                La scena è vuota: descrivi l&apos;ambiente nella chat o attendi la prima elaborazione.
              </p>
            </div>
          )}
          {walkMode && (
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-[11px] text-white">
              Clic per iniziare · W A S D per muoverti · Esc per uscire
            </p>
          )}
        </div>
      </section>

      <aside className="flex w-[400px] shrink-0 flex-col border-l border-border bg-surface">
        <div className="flex border-b border-border">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition ${
                tab === id ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {tab === "chat" && (
            <ChatPanel
              userId={userId}
              projectId={project.id}
              initialMessages={initialMessages}
              autoRun={autoRun}
              onScene={(s) => setScene(s)}
            />
          )}
          {tab === "objects" && (
            <ObjectsPanel
              projectId={project.id}
              scene={scene}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onScene={setScene}
              library={library}
              folders={folders}
            />
          )}
          {tab === "render" && (
            <RenderPanel userId={userId} projectId={project.id} viewer={viewer} initialRenders={initialRenders} />
          )}
        </div>
      </aside>
    </div>
  );
}
