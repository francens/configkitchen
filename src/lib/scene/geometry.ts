import type { Opening, Room, Scene, SceneObject } from "./schema";

export type Vec2 = [number, number];

export function polygonArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Garantisce il verso antiorario (interno a sinistra di ogni lato). */
export function ensureCCW(poly: Vec2[]): Vec2[] {
  return polygonArea(poly) < 0 ? [...poly].reverse() : poly;
}

export function polygonBounds(poly: Vec2[]) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, d: maxY - minY };
}

export function sceneBounds(scene: Scene) {
  const pts: Vec2[] = scene.rooms.flatMap((r) => r.polygon);
  if (pts.length === 0) return { minX: 0, maxX: 400, minY: 0, maxY: 400, cx: 200, cy: 200, w: 400, d: 400 };
  return polygonBounds(pts);
}

export interface WallEdge {
  index: number;
  a: Vec2;
  b: Vec2;
  length: number;
  /** direzione unitaria da a verso b */
  dir: Vec2;
  /** normale unitaria verso l'interno della stanza */
  inward: Vec2;
}

export function roomEdges(room: Room): WallEdge[] {
  const poly = ensureCCW(room.polygon as Vec2[]);
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    const dir: Vec2 = [dx / length, dy / length];
    const inward: Vec2 = [-dir[1], dir[0]];
    return { index: i, a, b, length, dir, inward };
  });
}

export interface WallPiece {
  /** centro del pezzo in pianta */
  cx: number;
  cy: number;
  /** quota del fondo e altezza del pezzo */
  z0: number;
  h: number;
  /** lunghezza lungo il muro */
  len: number;
  /** angolo del muro in radianti (direzione a->b) */
  angle: number;
  /** indice del lato */
  wall: number;
  /** normale verso l'interno */
  inward: Vec2;
}

export interface OpeningPiece {
  opening: Opening;
  cx: number;
  cy: number;
  angle: number;
  inward: Vec2;
  wall: number;
}

export const WALL_THICKNESS = 12;

/**
 * Spezza ogni muro in pezzi attorno alle aperture (porte/finestre).
 * I muri sono posti all'esterno del poligono: le misure interne restano quelle della pianta.
 */
export function wallPieces(room: Room): { pieces: WallPiece[]; openings: OpeningPiece[] } {
  const edges = roomEdges(room);
  const pieces: WallPiece[] = [];
  const openings: OpeningPiece[] = [];
  const H = room.height;

  for (const e of edges) {
    const angle = Math.atan2(e.dir[1], e.dir[0]);
    // il muro sta fuori dalla stanza: sposta il centro di metà spessore verso l'esterno
    const ox = -e.inward[0] * (WALL_THICKNESS / 2);
    const oy = -e.inward[1] * (WALL_THICKNESS / 2);
    const place = (from: number, to: number, z0: number, h: number) => {
      if (to - from <= 0.5 || h <= 0.5) return;
      const mid = (from + to) / 2;
      pieces.push({
        cx: e.a[0] + e.dir[0] * mid + ox,
        cy: e.a[1] + e.dir[1] * mid + oy,
        z0,
        h,
        len: to - from,
        angle,
        wall: e.index,
        inward: e.inward,
      });
    };

    const ops = room.openings
      .filter((o) => o.wall === e.index)
      .map((o) => ({ ...o, offset: Math.max(0, Math.min(o.offset, e.length - o.width)) }))
      .sort((a, b) => a.offset - b.offset);

    let cursor = 0;
    for (const o of ops) {
      place(cursor, o.offset, 0, H);
      // sopra l'apertura
      const top = o.sill + o.height;
      place(o.offset, o.offset + o.width, top, H - top);
      // sotto la finestra
      if (o.sill > 0) place(o.offset, o.offset + o.width, 0, o.sill);
      const mid = o.offset + o.width / 2;
      openings.push({
        opening: o,
        cx: e.a[0] + e.dir[0] * mid + ox,
        cy: e.a[1] + e.dir[1] * mid + oy,
        angle,
        inward: e.inward,
        wall: e.index,
      });
      cursor = o.offset + o.width;
    }
    place(cursor, e.length, 0, H);
  }
  return { pieces, openings };
}

/** Calcola posizione e rotazione di un oggetto ancorato a un muro. */
export function resolveAnchor(obj: SceneObject, rooms: Room[]): SceneObject {
  if (!obj.anchor) return obj;
  const room = rooms.find((r) => r.id === obj.anchor!.room);
  if (!room) return obj;
  const edges = roomEdges(room);
  const e = edges[obj.anchor.wall % edges.length];
  if (!e) return obj;
  const along = obj.anchor.offset + obj.size.w / 2;
  const fromWall = obj.size.d / 2 + (obj.anchor.gap ?? 0);
  const x = e.a[0] + e.dir[0] * along + e.inward[0] * fromWall;
  const y = e.a[1] + e.dir[1] * along + e.inward[1] * fromWall;
  // lo schienale (+y locale) deve guardare il muro, cioè -inward
  const rotation = (Math.atan2(-e.inward[1], -e.inward[0]) * 180) / Math.PI - 90;
  return { ...obj, room: room.id, position: { x, y, z: obj.position?.z ?? 0 }, rotation };
}

/** Normalizza la scena: poligoni antiorari, ancoraggi risolti. */
export function normalizeScene(scene: Scene): Scene {
  const rooms = scene.rooms.map((r) => ({ ...r, polygon: ensureCCW(r.polygon as Vec2[]) }));
  const objects = scene.objects.map((o) => resolveAnchor(o, rooms));
  return { ...scene, rooms, objects };
}

/** cm di pianta -> metri di three.js (x est, y alto, z sud) */
export function toThree(x: number, y: number, z: number): [number, number, number] {
  return [x / 100, z / 100, -y / 100];
}

export function defaultCamera(scene: Scene) {
  const b = sceneBounds(scene);
  const span = Math.max(b.w, b.d, 300);
  // Quattro punti di vista diagonali: scegli quello che vede il fronte degli oggetti più grandi.
  const candidates: Vec2[] = [
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const toCam: Vec2 = [c[0] / Math.SQRT2, c[1] / Math.SQRT2];
    let score = 0;
    for (const o of scene.objects) {
      const r = (o.rotation * Math.PI) / 180;
      const front: Vec2 = [Math.sin(r), -Math.cos(r)];
      const weight = o.size.w * o.size.h;
      // fronte visibile: punteggio positivo; schienale verso la camera: negativo
      score += (front[0] * toCam[0] + front[1] * toCam[1]) * weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return {
    position: [b.cx + best[0] * span * 0.95, b.cy + best[1] * span * 1.05, span * 0.75] as [number, number, number],
    target: [b.cx, b.cy, 90] as [number, number, number],
    fov: 50,
  };
}
