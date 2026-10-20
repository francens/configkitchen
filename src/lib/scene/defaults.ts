import { SceneSchema, type Scene } from "./schema";
import { normalizeScene } from "./geometry";

export function emptyScene(): Scene {
  return SceneSchema.parse({});
}

/** Scena dimostrativa: living con cucina, usata per i test e come esempio per l'AI. */
export function sampleScene(): Scene {
  const scene = SceneSchema.parse({
    rooms: [
      {
        id: "living",
        name: "Zona living",
        polygon: [
          [0, 0],
          [620, 0],
          [620, 450],
          [0, 450],
        ],
        height: 270,
        floorMaterial: "rovere",
        wallMaterial: "bianco",
        openings: [
          { id: "fin1", type: "window", wall: 1, offset: 130, width: 180, height: 140, sill: 95 },
          { id: "porta1", type: "door", wall: 3, offset: 60, width: 90, height: 210, sill: 0 },
        ],
      },
    ],
    materials: {
      rovere: { id: "rovere", name: "Rovere naturale", color: "#b89468", roughness: 0.7, widthCm: 120, heightCm: 20 },
      bianco: { id: "bianco", name: "Bianco opaco", color: "#f2efe9", roughness: 0.9 },
      fenix: { id: "fenix", name: "Grigio Fenix", color: "#6f6b66", roughness: 0.55 },
      calacatta: { id: "calacatta", name: "Marmo Calacatta", color: "#e9e6e0", roughness: 0.25 },
      noce: { id: "noce", name: "Noce canaletto", color: "#6b4a2f", roughness: 0.6 },
      lino: { id: "lino", name: "Lino sabbia", color: "#c9bda8", roughness: 0.95 },
      nero: { id: "nero", name: "Metallo nero", color: "#2a2a2a", roughness: 0.4, metalness: 0.6 },
    },
    objects: [
      {
        id: "cucina",
        kind: "kitchen_linear",
        label: "Cucina lineare 360",
        anchor: { room: "living", wall: 0, offset: 20, gap: 0 },
        position: { x: 0, y: 0, z: 0 },
        size: { w: 360, d: 60, h: 240 },
        materials: { ante: "fenix", piano: "calacatta", schienale: "calacatta", pensili: "fenix", fianchi: "fenix" },
        params: { modules: [60, 60, 90, 60, 90], wallUnits: true, tallUnitsRight: 1 },
      },
      {
        id: "isola",
        kind: "kitchen_island",
        label: "Isola",
        room: "living",
        position: { x: 200, y: 180, z: 0 },
        rotation: 0,
        size: { w: 200, d: 90, h: 90 },
        materials: { ante: "noce", piano: "calacatta", fianchi: "noce" },
      },
      {
        id: "divano",
        kind: "sofa",
        label: "Divano 3 posti",
        room: "living",
        position: { x: 470, y: 300, z: 0 },
        rotation: -90,
        size: { w: 240, d: 95, h: 80 },
        materials: { tessuto: "lino", struttura: "nero" },
      },
      {
        id: "tavolo",
        kind: "table",
        label: "Tavolo pranzo",
        room: "living",
        position: { x: 460, y: 120, z: 0 },
        rotation: 0,
        size: { w: 180, d: 90, h: 75 },
        materials: { piano: "noce", gambe: "nero" },
      },
      ...[0, 1, 2, 3].map((i) => ({
        id: `sedia${i + 1}`,
        kind: "chair" as const,
        label: `Sedia ${i + 1}`,
        room: "living",
        position: { x: 420 + (i % 2) * 80, y: i < 2 ? 65 : 175, z: 0 },
        rotation: i < 2 ? 180 : 0,
        size: { w: 45, d: 50, h: 85 },
        materials: { seduta: "lino", struttura: "nero" },
      })),
      {
        id: "libreria",
        kind: "bookcase",
        label: "Libreria",
        anchor: { room: "living", wall: 2, offset: 40, gap: 0 },
        position: { x: 0, y: 0, z: 0 },
        size: { w: 180, d: 35, h: 220 },
        materials: { struttura: "noce" },
        params: { shelves: 5 },
      },
    ],
    notes: "Scena di esempio.",
  });
  return normalizeScene(scene);
}
