"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Edges, Html, useGLTF } from "@react-three/drei";
import type { SceneObject } from "@/lib/scene/schema";
import { toThree } from "@/lib/scene/geometry";
import { Surface } from "./materials";

/** Scatola in coordinate locali (metri): x destra, y alto, z verso il fronte. */
function B({
  x = 0,
  y = 0,
  z = 0,
  w,
  h,
  d,
  mat,
  fallback,
  tile,
  rough,
  metal,
}: {
  x?: number;
  y?: number;
  z?: number;
  w: number;
  h: number;
  d: number;
  mat?: string;
  fallback?: string;
  tile?: [number, number];
  rough?: number;
  metal?: number;
}) {
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[Math.max(w, 0.002), Math.max(h, 0.002), Math.max(d, 0.002)]} />
      <Surface id={mat} fallback={fallback} tile={tile ?? [w, h]} roughness={rough} metalness={metal} />
    </mesh>
  );
}

function Handle({ x, y, z, vertical = false, len = 0.16 }: { x: number; y: number; z: number; vertical?: boolean; len?: number }) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={vertical ? [0.012, len, 0.02] : [len, 0.012, 0.02]} />
      <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.35} />
    </mesh>
  );
}

function splitModules(totalM: number, modulesCm?: unknown): number[] {
  if (Array.isArray(modulesCm) && modulesCm.length) {
    const ms = modulesCm.map((m) => Number(m) / 100).filter((m) => m > 0.05);
    const sum = ms.reduce((a, b) => a + b, 0);
    if (sum > 0) return ms.map((m) => (m * totalM) / sum);
  }
  const n = Math.max(1, Math.round(totalM / 0.6));
  return Array(n).fill(totalM / n);
}

/** Fronti affiancati lungo x, con fughe di 4 mm. Le ante oltre 70 cm sono doppie. */
function Fronts({
  modules,
  x0,
  y,
  z,
  h,
  mat,
  handles = true,
}: {
  modules: number[];
  x0: number;
  y: number;
  z: number;
  h: number;
  mat?: string;
  handles?: boolean;
}) {
  let cursor = x0;
  const out: React.ReactNode[] = [];
  modules.forEach((m, i) => {
    const doors = m > 0.7 ? 2 : 1;
    for (let k = 0; k < doors; k++) {
      const dw = m / doors;
      const cx = cursor + dw / 2;
      out.push(<B key={`${i}-${k}`} x={cx} y={y} z={z} w={dw - 0.004} h={h - 0.004} d={0.02} mat={mat} fallback="#e9e5de" />);
      if (handles) {
        const hx = doors === 2 ? (k === 0 ? cx + dw / 2 - 0.05 : cx - dw / 2 + 0.05) : cx;
        out.push(<Handle key={`h${i}-${k}`} x={hx} y={y + h / 2 - 0.06} z={z + 0.02} />);
      }
      cursor += dw;
    }
  });
  return <>{out}</>;
}

function KitchenLinear({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const tall = Math.max(0, Math.min(3, Number(o.params.tallUnitsRight ?? 0)));
  const tallW = tall * 0.6;
  const baseW = Math.max(0.6, W - tallW);
  const baseX0 = -W / 2;
  const modules = useMemo(() => splitModules(baseW, o.params.modules), [baseW, o.params.modules]);
  const wallUnits = o.params.wallUnits !== false && H >= 2.0;
  const wallH = Math.min(0.72, H - 1.4);
  const topY = 0.9;
  return (
    <group>
      {/* zoccolo e corpo basi */}
      <B x={baseX0 + baseW / 2} y={0.05} z={-0.04} w={baseW - 0.02} h={0.1} d={D - 0.08} mat={m.fianchi} fallback="#5a5753" />
      <B x={baseX0 + baseW / 2} y={0.1 + 0.76 / 2} z={-0.01} w={baseW} h={0.76} d={D - 0.02} mat={m.fianchi} fallback="#d9d4cb" />
      <Fronts modules={modules} x0={baseX0} y={0.1 + 0.76 / 2} z={D / 2 - 0.01} h={0.76} mat={m.ante} />
      {/* piano */}
      <B x={baseX0 + baseW / 2} y={topY - 0.02} z={0.01} w={baseW + 0.005} h={0.04} d={D + 0.02} mat={m.piano} fallback="#e7e3dc" tile={[baseW, D]} rough={0.35} />
      {/* schienale */}
      <B x={baseX0 + baseW / 2} y={topY + 0.25} z={-D / 2 + 0.006} w={baseW} h={0.5} d={0.012} mat={m.schienale ?? m.piano} fallback="#e7e3dc" tile={[baseW, 0.5]} rough={0.35} />
      {/* pensili */}
      {wallUnits && (
        <>
          <B x={baseX0 + baseW / 2} y={1.4 + wallH / 2} z={-D / 2 + 0.175} w={baseW} h={wallH} d={0.35} mat={m.fianchi} fallback="#d9d4cb" />
          <Fronts modules={modules} x0={baseX0} y={1.4 + wallH / 2} z={-D / 2 + 0.35 - 0.01} h={wallH} mat={m.pensili ?? m.ante} />
        </>
      )}
      {/* colonne */}
      {Array.from({ length: tall }).map((_, i) => {
        const cx = W / 2 - 0.3 - i * 0.6;
        return (
          <group key={i}>
            <B x={cx} y={H / 2} z={-0.01} w={0.6} h={H} d={D - 0.02} mat={m.fianchi} fallback="#d9d4cb" />
            <B x={cx} y={0.65} z={D / 2 - 0.01} w={0.596} h={1.3 - 0.004} d={0.02} mat={m.ante} fallback="#e9e5de" />
            <B x={cx} y={1.3 + (H - 1.3) / 2} z={D / 2 - 0.01} w={0.596} h={H - 1.3 - 0.004} d={0.02} mat={m.ante} fallback="#e9e5de" />
            <Handle x={cx - 0.25} y={1.3 - 0.4} z={D / 2 + 0.01} vertical len={0.3} />
            <Handle x={cx - 0.25} y={1.3 + 0.2} z={D / 2 + 0.01} vertical len={0.3} />
          </group>
        );
      })}
    </group>
  );
}

function KitchenIsland({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const modules = useMemo(() => splitModules(W, o.params.modules), [W, o.params.modules]);
  return (
    <group>
      <B y={0.05} w={W - 0.08} h={0.1} d={D - 0.1} mat={m.fianchi} fallback="#5a5753" />
      <B y={0.1 + (H - 0.14) / 2} w={W} h={H - 0.14} d={D - 0.04} mat={m.fianchi} fallback="#d9d4cb" />
      <Fronts modules={modules} x0={-W / 2} y={0.1 + (H - 0.14) / 2} z={D / 2 - 0.01} h={H - 0.14} mat={m.ante} />
      <group rotation-y={Math.PI}>
        <Fronts modules={modules} x0={-W / 2} y={0.1 + (H - 0.14) / 2} z={D / 2 - 0.01} h={H - 0.14} mat={m.ante} handles={false} />
      </group>
      <B y={H - 0.02} w={W + 0.06} h={0.04} d={D + 0.06} mat={m.piano} fallback="#e7e3dc" tile={[W, D]} rough={0.35} />
    </group>
  );
}

function Wardrobe({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const n = Math.max(1, Math.round(Number(o.params.doors ?? W / 0.5)));
  const dw = W / n;
  return (
    <group>
      <B y={H / 2} z={-0.01} w={W} h={H} d={D - 0.02} mat={m.struttura ?? m.ante} fallback="#d9d4cb" />
      {Array.from({ length: n }).map((_, i) => {
        const cx = -W / 2 + dw * (i + 0.5);
        return (
          <group key={i}>
            <B x={cx} y={H / 2} z={D / 2 - 0.01} w={dw - 0.004} h={H - 0.02} d={0.02} mat={m.ante} fallback="#e9e5de" tile={[dw, H]} />
            <Handle x={i % 2 === 0 ? cx + dw / 2 - 0.04 : cx - dw / 2 + 0.04} y={H / 2} z={D / 2 + 0.01} vertical len={0.3} />
          </group>
        );
      })}
    </group>
  );
}

function Bed({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  return (
    <group>
      <B y={0.14} z={0.03} w={W} h={0.28} d={D - 0.06} mat={m.struttura} fallback="#8a7158" />
      <B y={0.28 + 0.11} z={0.12} w={W - 0.08} h={0.22} d={D - 0.3} mat={m.tessuto} fallback="#efece6" rough={0.95} />
      <B y={H / 2} z={-D / 2 + 0.03} w={W} h={H} d={0.06} mat={m.testiera ?? m.struttura} fallback="#8a7158" />
      <B x={-W / 4 + 0.02} y={0.5 + 0.06} z={-D / 2 + 0.36} w={W / 2 - 0.16} h={0.12} d={0.42} fallback="#ffffff" rough={0.95} />
      <B x={W / 4 - 0.02} y={0.5 + 0.06} z={-D / 2 + 0.36} w={W / 2 - 0.16} h={0.12} d={0.42} fallback="#ffffff" rough={0.95} />
    </group>
  );
}

function Sofa({ o, single = false }: { o: SceneObject; single?: boolean }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const armW = Math.min(0.2, W / 6);
  const inner = W - armW * 2;
  const n = single ? 1 : Math.max(1, Math.round(inner / 0.75));
  const cw = inner / n;
  return (
    <group>
      <B y={0.26} w={W} h={0.32} d={D} mat={m.tessuto} fallback="#c9bda8" rough={0.95} />
      <B y={0.1 + (H - 0.1) / 2} z={-D / 2 + 0.11} w={W} h={H - 0.1} d={0.22} mat={m.tessuto} fallback="#c9bda8" rough={0.95} />
      <B x={-W / 2 + armW / 2} y={0.1 + 0.52 / 2} w={armW} h={0.52} d={D} mat={m.tessuto} fallback="#c9bda8" rough={0.95} />
      <B x={W / 2 - armW / 2} y={0.1 + 0.52 / 2} w={armW} h={0.52} d={D} mat={m.tessuto} fallback="#c9bda8" rough={0.95} />
      {Array.from({ length: n }).map((_, i) => (
        <B key={i} x={-inner / 2 + cw * (i + 0.5)} y={0.42 + 0.07} z={0.11} w={cw - 0.02} h={0.14} d={D - 0.3} mat={m.tessuto} fallback="#d4c9b5" rough={0.95} />
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <B key={`${sx}${sz}`} x={sx * (W / 2 - 0.08)} y={0.05} z={sz * (D / 2 - 0.08)} w={0.05} h={0.1} d={0.05} mat={m.struttura} fallback="#2a2a2a" metal={0.5} rough={0.4} />
        )),
      )}
    </group>
  );
}

function Table({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  return (
    <group>
      <B y={H - 0.02} w={W} h={0.04} d={D} mat={m.piano} fallback="#8a6a4b" tile={[W, D]} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <B key={`${sx}${sz}`} x={sx * (W / 2 - 0.08)} y={(H - 0.04) / 2} z={sz * (D / 2 - 0.08)} w={0.05} h={H - 0.04} d={0.05} mat={m.gambe} fallback="#2a2a2a" />
        )),
      )}
    </group>
  );
}

function Chair({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  return (
    <group>
      <B y={0.45} w={W} h={0.04} d={D} mat={m.seduta} fallback="#c9bda8" rough={0.9} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <B key={`${sx}${sz}`} x={sx * (W / 2 - 0.03)} y={0.215} z={sz * (D / 2 - 0.03)} w={0.03} h={0.43} d={0.03} mat={m.struttura} fallback="#2a2a2a" />
        )),
      )}
      <B y={0.47 + (H - 0.47) / 2} z={-D / 2 + 0.02} w={W - 0.04} h={H - 0.47} d={0.03} mat={m.seduta} fallback="#c9bda8" rough={0.9} />
    </group>
  );
}

function Sideboard({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const legs = 0.12;
  const modules = useMemo(() => splitModules(W, o.params.modules), [W, o.params.modules]);
  return (
    <group>
      <B y={legs + (H - legs - 0.02) / 2} z={-0.01} w={W} h={H - legs - 0.02} d={D - 0.02} mat={m.struttura ?? m.ante} fallback="#d9d4cb" />
      <Fronts modules={modules} x0={-W / 2} y={legs + (H - legs - 0.02) / 2} z={D / 2 - 0.01} h={H - legs - 0.02} mat={m.ante} />
      <B y={H - 0.01} w={W + 0.02} h={0.02} d={D + 0.02} mat={m.piano ?? m.struttura} fallback="#8a6a4b" tile={[W, D]} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <B key={`${sx}${sz}`} x={sx * (W / 2 - 0.06)} y={legs / 2} z={sz * (D / 2 - 0.06)} w={0.03} h={legs} d={0.03} fallback="#2a2a2a" />
        )),
      )}
    </group>
  );
}

function Bookcase({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  const shelves = Math.max(1, Math.round(Number(o.params.shelves ?? Math.floor(H / 0.35))));
  const t = 0.03;
  return (
    <group>
      <B x={-W / 2 + t / 2} y={H / 2} w={t} h={H} d={D} mat={m.struttura} fallback="#8a6a4b" />
      <B x={W / 2 - t / 2} y={H / 2} w={t} h={H} d={D} mat={m.struttura} fallback="#8a6a4b" />
      <B y={H - t / 2} w={W} h={t} d={D} mat={m.struttura} fallback="#8a6a4b" />
      <B y={t / 2} w={W} h={t} d={D} mat={m.struttura} fallback="#8a6a4b" />
      <B y={H / 2} z={-D / 2 + 0.005} w={W - t} h={H - t} d={0.01} mat={m.struttura} fallback="#9d7f5f" />
      {Array.from({ length: shelves - 1 }).map((_, i) => (
        <B key={i} y={(H / shelves) * (i + 1)} w={W - t * 2} h={0.025} d={D - 0.02} mat={m.struttura} fallback="#8a6a4b" />
      ))}
    </group>
  );
}

function Desk({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  const m = o.materials;
  return (
    <group>
      <B y={H - 0.015} w={W} h={0.03} d={D} mat={m.piano} fallback="#e7e3dc" tile={[W, D]} />
      <B x={-W / 2 + 0.015} y={(H - 0.03) / 2} w={0.03} h={H - 0.03} d={D - 0.05} mat={m.gambe} fallback="#2a2a2a" />
      <B x={W / 2 - 0.015} y={(H - 0.03) / 2} w={0.03} h={H - 0.03} d={D - 0.05} mat={m.gambe} fallback="#2a2a2a" />
    </group>
  );
}

function Box({ o }: { o: SceneObject }) {
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  return <B y={H / 2} w={W} h={H} d={D} mat={o.materials.superficie} fallback="#d9d4cb" tile={[W, H]} />;
}

function GltfModel({ url, o }: { url: string; o: SceneObject }) {
  const gltf = useGLTF(url);
  const { scale, offset } = useMemo(() => {
    const obj = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const target = new THREE.Vector3(o.size.w / 100, o.size.h / 100, o.size.d / 100);
    const s = Math.min(target.x / (size.x || 1), target.y / (size.y || 1), target.z / (size.z || 1));
    const center = new THREE.Vector3();
    box.getCenter(center);
    return { scale: s, offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s) };
  }, [gltf.scene, o.size.w, o.size.h, o.size.d]);
  return <primitive object={gltf.scene} scale={scale} position={offset} />;
}

function Imported({ o, assetUrls }: { o: SceneObject; assetUrls: Record<string, string> }) {
  const path = typeof o.params.path === "string" ? o.params.path : undefined;
  const url = path ? assetUrls[path] : undefined;
  if (!url) return <Box o={o} />;
  return (
    <Suspense fallback={<Box o={o} />}>
      <GltfModel url={url} o={o} />
    </Suspense>
  );
}

function Body({ o, assetUrls }: { o: SceneObject; assetUrls: Record<string, string> }) {
  switch (o.kind) {
    case "kitchen_linear":
      return <KitchenLinear o={o} />;
    case "kitchen_island":
      return <KitchenIsland o={o} />;
    case "wardrobe":
      return <Wardrobe o={o} />;
    case "bed":
      return <Bed o={o} />;
    case "sofa":
      return <Sofa o={o} />;
    case "armchair":
      return <Sofa o={o} single />;
    case "table":
      return <Table o={o} />;
    case "chair":
      return <Chair o={o} />;
    case "sideboard":
      return <Sideboard o={o} />;
    case "bookcase":
      return <Bookcase o={o} />;
    case "desk":
      return <Desk o={o} />;
    case "imported_model":
      return <Imported o={o} assetUrls={assetUrls} />;
    default:
      return <Box o={o} />;
  }
}

export default function Furniture({
  object: o,
  selected,
  showDimensions,
  assetUrls,
  onSelect,
}: {
  object: SceneObject;
  selected?: boolean;
  showDimensions?: boolean;
  assetUrls: Record<string, string>;
  onSelect?: (id: string) => void;
}) {
  const pos = toThree(o.position.x, o.position.y, o.position.z ?? 0);
  const W = o.size.w / 100;
  const D = o.size.d / 100;
  const H = o.size.h / 100;
  return (
    <group
      position={pos}
      rotation-y={(o.rotation * Math.PI) / 180}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(o.id);
      }}
    >
      <Body o={o} assetUrls={assetUrls} />
      {selected && (
        <mesh position-y={H / 2}>
          <boxGeometry args={[W + 0.03, H + 0.03, D + 0.03]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color="#b5602c" lineWidth={1.5} />
        </mesh>
      )}
      {(showDimensions || selected) && (
        <Html position={[0, H + 0.12, 0]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-ink/85 px-2 py-1 text-[11px] text-white shadow">
            {o.label} · {Math.round(o.size.w)} × {Math.round(o.size.d)} × h {Math.round(o.size.h)}
          </div>
        </Html>
      )}
    </group>
  );
}
