"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Room as RoomType } from "@/lib/scene/schema";
import { WALL_THICKNESS, ensureCCW, polygonBounds, toThree, wallPieces, type Vec2 } from "@/lib/scene/geometry";
import { Surface } from "./materials";

function pointInPolygon(x: number, y: number, poly: Vec2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function Room({ room, showDimensions }: { room: RoomType; showDimensions?: boolean }) {
  const poly = useMemo(() => ensureCCW(room.polygon as Vec2[]), [room.polygon]);
  const { pieces, openings } = useMemo(() => wallPieces({ ...room, polygon: poly }), [room, poly]);
  const bounds = useMemo(() => polygonBounds(poly), [poly]);
  const H = room.height / 100;

  const floorShape = useMemo(() => {
    const s = new THREE.Shape();
    poly.forEach(([x, y], i) => (i === 0 ? s.moveTo(x / 100, y / 100) : s.lineTo(x / 100, y / 100)));
    s.closePath();
    return s;
  }, [poly]);

  const wallRefs = useRef<(THREE.Object3D | null)[]>([]);
  const openingRefs = useRef<(THREE.Object3D | null)[]>([]);
  const ceilingRef = useRef<THREE.Mesh>(null);

  // Vista "casa di bambola": nasconde i muri tra la camera e la stanza.
  useFrame(({ camera }) => {
    const cx = camera.position.x * 100;
    const cy = -camera.position.z * 100;
    const inside = pointInPolygon(cx, cy, poly) && camera.position.y * 100 < room.height;
    pieces.forEach((p, i) => {
      const m = wallRefs.current[i];
      if (!m) return;
      const d = (cx - p.cx) * p.inward[0] + (cy - p.cy) * p.inward[1];
      m.visible = inside || d > -WALL_THICKNESS;
    });
    openings.forEach((p, i) => {
      const m = openingRefs.current[i];
      if (!m) return;
      const d = (cx - p.cx) * p.inward[0] + (cy - p.cy) * p.inward[1];
      m.visible = inside || d > -WALL_THICKNESS;
    });
    if (ceilingRef.current) ceilingRef.current.visible = inside;
  });

  return (
    <group>
      {/* pavimento */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position-y={0.001}>
        <shapeGeometry args={[floorShape]} />
        <Surface id={room.floorMaterial} fallback="#c9b89a" tile={[1, 1]} />
      </mesh>
      {/* soffitto: visibile solo dall'interno */}
      <mesh ref={ceilingRef} rotation-x={Math.PI / 2} position-y={H} visible={false}>
        <shapeGeometry args={[floorShape]} />
        <Surface id={room.ceilingMaterial ?? room.wallMaterial} fallback="#f4f2ee" roughness={0.95} />
      </mesh>
      {/* muri */}
      {pieces.map((p, i) => {
        const pos = toThree(p.cx, p.cy, p.z0 + p.h / 2);
        return (
          <mesh
            key={`w${i}`}
            ref={(el) => {
              wallRefs.current[i] = el;
            }}
            position={pos}
            rotation-y={p.angle}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[p.len / 100, p.h / 100, WALL_THICKNESS / 100]} />
            <Surface id={room.wallMaterial} fallback="#f1eee8" tile={[p.len / 100, p.h / 100]} />
          </mesh>
        );
      })}
      {/* porte e finestre */}
      {openings.map((o, i) => {
        const op = o.opening;
        const pos = toThree(o.cx, o.cy, op.sill + op.height / 2);
        const w = op.width / 100;
        const h = op.height / 100;
        const t = WALL_THICKNESS / 100;
        return (
          <group
            key={`o${i}`}
            ref={(el) => {
              openingRefs.current[i] = el;
            }}
            position={pos}
            rotation-y={o.angle}
          >
            {op.type === "window" ? (
              <>
                {/* telaio */}
                <mesh position-y={h / 2 - 0.025} castShadow>
                  <boxGeometry args={[w, 0.05, t * 0.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                <mesh position-y={-h / 2 + 0.025} castShadow>
                  <boxGeometry args={[w, 0.05, t * 0.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                <mesh position-x={-w / 2 + 0.025}>
                  <boxGeometry args={[0.05, h, t * 0.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                <mesh position-x={w / 2 - 0.025}>
                  <boxGeometry args={[0.05, h, t * 0.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.04, h - 0.1, t * 0.4]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                {/* vetro */}
                <mesh>
                  <boxGeometry args={[w - 0.08, h - 0.08, 0.01]} />
                  <meshPhysicalMaterial color="#dbe8f0" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
                </mesh>
              </>
            ) : (
              <>
                {/* stipite */}
                <mesh position-y={h / 2 - 0.03}>
                  <boxGeometry args={[w + 0.1, 0.06, t * 1.05]} />
                  <meshStandardMaterial color="#f6f4f0" roughness={0.6} />
                </mesh>
                <mesh position-x={-w / 2 - 0.025}>
                  <boxGeometry args={[0.05, h, t * 1.05]} />
                  <meshStandardMaterial color="#f6f4f0" roughness={0.6} />
                </mesh>
                <mesh position-x={w / 2 + 0.025}>
                  <boxGeometry args={[0.05, h, t * 1.05]} />
                  <meshStandardMaterial color="#f6f4f0" roughness={0.6} />
                </mesh>
                {/* anta, leggermente aperta verso l'interno */}
                <group position={[-w / 2, 0, t / 2]} rotation-y={-0.35}>
                  <mesh position-x={w / 2 - 0.02} castShadow>
                    <boxGeometry args={[w - 0.04, h - 0.04, 0.045]} />
                    <meshStandardMaterial color="#f3f1ec" roughness={0.55} />
                  </mesh>
                  <mesh position={[w - 0.12, 0, 0.04]}>
                    <boxGeometry args={[0.12, 0.02, 0.02]} />
                    <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
                  </mesh>
                </group>
              </>
            )}
          </group>
        );
      })}
      {showDimensions && (
        <Html position={toThree(bounds.cx, bounds.cy, 2)} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-ink/85 px-2 py-1 text-[11px] text-white shadow">
            {room.name} · {Math.round(bounds.w)} × {Math.round(bounds.d)} cm · h {room.height}
          </div>
        </Html>
      )}
    </group>
  );
}
