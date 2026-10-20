"use client";

import { Suspense, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls, PointerLockControls, SoftShadows } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Camera as SceneCamera, Scene } from "@/lib/scene/schema";
import { defaultCamera, sceneBounds, toThree } from "@/lib/scene/geometry";
import Room from "./Room";
import Furniture from "./Furniture";
import { SceneContext, TextureProvider } from "./materials";

export type ViewPreset = "persp" | "top" | "eye";

export type ViewerHandle = {
  /** PNG dell'inquadratura corrente, a risoluzione moltiplicata per scale */
  capture: (scale?: number) => string;
  getCamera: () => SceneCamera;
  setView: (preset: ViewPreset) => void;
};

export type SceneViewerProps = {
  scene: Scene;
  assetUrls: Record<string, string>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showDimensions?: boolean;
  walkMode?: boolean;
  handleRef?: React.RefObject<ViewerHandle | null>;
};

function Lighting({ scene }: { scene: Scene }) {
  const b = sceneBounds(scene);
  const span = Math.max(b.w, b.d) / 100 + 4;
  const [cx, , cz] = toThree(b.cx, b.cy, 0);
  return (
    <>
      <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#b8b0a4" />
      <directionalLight
        position={[cx + span * 0.5, span * 1.1, cz + span * 0.35]}
        target-position={[cx, 0, cz]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 4}
      />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#e9e6df"]} />
        <Lightformer intensity={2.5} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[12, 12, 1]} />
        <Lightformer intensity={1.2} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[8, 4, 1]} />
        <Lightformer intensity={0.8} rotation-y={-Math.PI / 2} position={[8, 2, 0]} scale={[8, 4, 1]} />
        <Lightformer intensity={0.6} position={[0, 2, -8]} scale={[8, 4, 1]} />
      </Environment>
    </>
  );
}

function WalkControls() {
  const get = useThree((s) => s.get);
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    get().camera.position.setY(1.6);
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [get]);
  useFrame((_, dt) => {
    const { camera } = get();
    const k = keys.current;
    const speed = (k.ShiftLeft ? 3.2 : 1.7) * Math.min(dt, 0.05);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(fwd, speed);
    if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(fwd, -speed);
    if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(right, -speed);
    if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(right, speed);
    camera.position.setY(1.6);
  });
  return <PointerLockControls />;
}

function Bridge({
  handleRef,
  controls,
  scene,
}: {
  handleRef?: React.RefObject<ViewerHandle | null>;
  controls: React.RefObject<OrbitControlsImpl | null>;
  scene: Scene;
}) {
  const get = useThree((s) => s.get);
  useImperativeHandle(
    handleRef,
    () => ({
      capture(scale = 2) {
        const { gl, scene: s, camera } = get();
        const prev = gl.getPixelRatio();
        gl.setPixelRatio(Math.min(prev * scale, 4));
        gl.render(s, camera);
        const url = gl.domElement.toDataURL("image/png");
        gl.setPixelRatio(prev);
        gl.render(s, camera);
        return url;
      },
      getCamera() {
        const c = get().camera as THREE.PerspectiveCamera;
        const t = controls.current?.target ?? new THREE.Vector3();
        return {
          position: [c.position.x * 100, -c.position.z * 100, c.position.y * 100],
          target: [t.x * 100, -t.z * 100, t.y * 100],
          fov: c.fov,
        };
      },
      setView(preset) {
        const c = get().camera as THREE.PerspectiveCamera;
        const b = sceneBounds(scene);
        const span = Math.max(b.w, b.d, 300) / 100;
        const [cx, , cz] = toThree(b.cx, b.cy, 0);
        const ctrl = controls.current;
        if (preset === "top") {
          c.position.set(cx, span * 1.6, cz + 0.001);
          ctrl?.target.set(cx, 0, cz);
        } else if (preset === "eye") {
          const [ex, , ez] = toThree(b.minX + 60, b.minY + 60, 0);
          c.position.set(ex, 1.6, ez);
          ctrl?.target.set(cx, 1.2, cz);
        } else {
          const d = defaultCamera(scene);
          c.position.set(...toThree(...d.position));
          ctrl?.target.set(...toThree(...d.target));
        }
        c.updateProjectionMatrix();
        ctrl?.update();
      },
    }),
    [get, controls, scene],
  );
  return null;
}

export default function SceneViewer({
  scene,
  assetUrls,
  selectedId,
  onSelect,
  showDimensions,
  walkMode,
  handleRef,
}: SceneViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const cam = scene.camera ?? defaultCamera(scene);
  const camPos = toThree(...cam.position);
  const camTarget = toThree(...cam.target);
  const hasRooms = scene.rooms.length > 0;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: cam.fov ?? 50, near: 0.05, far: 300, position: camPos }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      onPointerMissed={() => onSelect?.(null)}
    >
      <color attach="background" args={["#f1efe9"]} />
      <SoftShadows size={14} samples={12} focus={0.6} />
      <Lighting scene={scene} />
      <SceneContext.Provider value={scene}>
        <Suspense fallback={null}>
          <TextureProvider urls={assetUrls}>
            {scene.rooms.map((r) => (
              <Room key={r.id} room={r} showDimensions={showDimensions} />
            ))}
            {scene.objects.map((o) => (
              <Furniture
                key={o.id}
                object={o}
                selected={selectedId === o.id}
                showDimensions={showDimensions}
                assetUrls={assetUrls}
                onSelect={onSelect}
              />
            ))}
          </TextureProvider>
        </Suspense>
      </SceneContext.Provider>
      {/* terreno */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.25} />
      </mesh>
      {!hasRooms && <Grid infiniteGrid cellSize={0.5} sectionSize={2} fadeDistance={30} cellColor="#d9d4ca" sectionColor="#c4bdb0" />}
      {walkMode ? (
        <WalkControls />
      ) : (
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={camTarget}
          minDistance={0.4}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.01}
        />
      )}
      <Bridge handleRef={handleRef} controls={controls} scene={scene} />
    </Canvas>
  );
}
