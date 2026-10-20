"use client";

import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { Scene, SceneMaterial } from "@/lib/scene/schema";

export const TextureContext = createContext<Record<string, THREE.Texture>>({});
export const SceneContext = createContext<Scene | null>(null);

/** Carica tutte le texture referenziate dalla scena (una sola volta) e le mette nel contesto. */
export function TextureProvider({
  urls,
  children,
}: {
  urls: Record<string, string>;
  children: React.ReactNode;
}) {
  const keys = Object.keys(urls);
  const keyStr = keys.join("|");
  const loaded = useTexture(keys.length ? urls : { __none: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" });
  const value = useMemo(() => {
    const out: Record<string, THREE.Texture> = {};
    for (const k of keyStr ? keyStr.split("|") : []) {
      const src = (loaded as Record<string, THREE.Texture>)[k];
      if (!src) continue;
      const t = src.clone();
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      out[k] = t;
    }
    return out;
  }, [loaded, keyStr]);
  return <TextureContext.Provider value={value}>{children}</TextureContext.Provider>;
}

export function useSceneMaterial(id?: string): SceneMaterial | undefined {
  const scene = useContext(SceneContext);
  if (!id || !scene) return undefined;
  return scene.materials[id];
}

type SurfaceProps = {
  /** id del materiale nella scena */
  id?: string;
  /** colore di default se il materiale manca */
  fallback?: string;
  /** dimensione in metri della superficie (u, v) per piastrellare la texture alla scala fisica */
  tile?: [number, number];
  roughness?: number;
  metalness?: number;
  opacity?: number;
};

/** meshStandardMaterial costruito da un materiale della scena. */
export function Surface({ id, fallback = "#cfcac0", tile, roughness, metalness, opacity }: SurfaceProps) {
  const mat = useSceneMaterial(id);
  const textures = useContext(TextureContext);
  const base = mat?.texturePath ? textures[mat.texturePath] : undefined;
  const map = useMemo(() => {
    if (!base) return undefined;
    const t = base.clone();
    const wu = (mat?.widthCm ?? 100) / 100;
    const hv = (mat?.heightCm ?? 100) / 100;
    const [u, v] = tile ?? [wu, hv];
    t.repeat.set(u / wu, v / hv);
    t.needsUpdate = true;
    return t;
  }, [base, mat?.widthCm, mat?.heightCm, tile?.[0], tile?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <meshStandardMaterial
      color={map ? "#ffffff" : (mat?.color ?? fallback)}
      map={map}
      roughness={roughness ?? mat?.roughness ?? 0.6}
      metalness={metalness ?? mat?.metalness ?? 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  );
}
