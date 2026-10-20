import { z } from "zod";

/**
 * Scena = documento JSON, fonte di verità del progetto.
 * Unità: centimetri. Coordinate di pianta: x verso est, y verso nord, z verso l'alto.
 * Il viewer 3D converte in metri e nel sistema di three.js (y in alto).
 */

export const Vec2 = z.tuple([z.number(), z.number()]);

export const OpeningSchema = z.object({
  id: z.string(),
  type: z.enum(["door", "window"]),
  /** indice del lato del poligono: lato i va dal vertice i al vertice i+1 */
  wall: z.number().int().min(0),
  /** distanza in cm dall'inizio del lato */
  offset: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  /** altezza del davanzale dal pavimento (0 per le porte) */
  sill: z.number().min(0).default(0),
});

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** vertici in cm, in senso antiorario visti dall'alto */
  polygon: z.array(Vec2).min(3),
  height: z.number().positive().default(270),
  floorMaterial: z.string().optional(),
  wallMaterial: z.string().optional(),
  ceilingMaterial: z.string().optional(),
  openings: z.array(OpeningSchema).default([]),
});

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** colore base esadecimale, usato se non c'è texture */
  color: z.string().optional(),
  /** percorso nello storage Supabase (bucket materials), risolto in URL firmato a runtime */
  texturePath: z.string().optional(),
  normalPath: z.string().optional(),
  /** dimensione fisica della texture per piastrellarla alla scala giusta */
  widthCm: z.number().positive().default(100),
  heightCm: z.number().positive().default(100),
  roughness: z.number().min(0).max(1).default(0.6),
  metalness: z.number().min(0).max(1).default(0),
  /** id della finitura in materioteca, se proviene da lì */
  libraryId: z.string().optional(),
});

export const ObjectKind = z.enum([
  "kitchen_linear",
  "kitchen_island",
  "wardrobe",
  "bed",
  "sofa",
  "armchair",
  "table",
  "chair",
  "sideboard",
  "bookcase",
  "desk",
  "box",
  "imported_model",
]);

export const AnchorSchema = z.object({
  room: z.string(),
  /** lato della stanza a cui appoggiare lo schienale dell'oggetto */
  wall: z.number().int().min(0),
  /** distanza in cm dall'inizio del lato al bordo sinistro dell'oggetto (guardando il muro) */
  offset: z.number().min(0),
  /** distanza dal muro, 0 = a filo */
  gap: z.number().min(0).default(0),
});

export const SceneObjectSchema = z.object({
  id: z.string(),
  kind: ObjectKind,
  label: z.string(),
  room: z.string().optional(),
  /** centro dell'ingombro in pianta (x, y) e quota del fondo (z) in cm */
  position: z.object({ x: z.number(), y: z.number(), z: z.number().default(0) }),
  /** rotazione in gradi attorno alla verticale, antioraria; 0 = schienale verso +y (nord) */
  rotation: z.number().default(0),
  /** larghezza (fronte), profondità, altezza in cm */
  size: z.object({ w: z.number().positive(), d: z.number().positive(), h: z.number().positive() }),
  /** se presente, posizione e rotazione vengono calcolate per appoggiare l'oggetto al muro */
  anchor: AnchorSchema.optional(),
  /** slot -> id materiale (es. ante, piano, fianchi, tessuto, struttura) */
  materials: z.record(z.string(), z.string()).default({}),
  /** parametri specifici del tipo (moduli cucina, numero ante, ecc.) */
  params: z.record(z.string(), z.unknown()).default({}),
  source: z
    .object({
      type: z.enum(["upload", "web", "parametric"]),
      ref: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});

export const CameraSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
  fov: z.number().default(55),
});

export const SceneSchema = z.object({
  version: z.literal(1).default(1),
  units: z.literal("cm").default("cm"),
  rooms: z.array(RoomSchema).default([]),
  objects: z.array(SceneObjectSchema).default([]),
  materials: z.record(z.string(), MaterialSchema).default({}),
  camera: CameraSchema.optional(),
  /** ipotesi fatte dall'AI quando mancavano informazioni */
  notes: z.string().optional(),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type SceneMaterial = z.infer<typeof MaterialSchema>;
export type ObjectKindType = z.infer<typeof ObjectKind>;
export type Camera = z.infer<typeof CameraSchema>;

/** Slot materiale disponibili per ogni tipo di oggetto (per UI e prompt). */
export const MATERIAL_SLOTS: Record<ObjectKindType, string[]> = {
  kitchen_linear: ["ante", "piano", "schienale", "pensili", "fianchi"],
  kitchen_island: ["ante", "piano", "fianchi"],
  wardrobe: ["ante", "struttura"],
  bed: ["struttura", "tessuto", "testiera"],
  sofa: ["tessuto", "struttura"],
  armchair: ["tessuto", "struttura"],
  table: ["piano", "gambe"],
  chair: ["seduta", "struttura"],
  sideboard: ["ante", "struttura", "piano"],
  bookcase: ["struttura"],
  desk: ["piano", "gambe"],
  box: ["superficie"],
  imported_model: [],
};

export const KIND_LABELS: Record<ObjectKindType, string> = {
  kitchen_linear: "Cucina lineare",
  kitchen_island: "Isola cucina",
  wardrobe: "Armadio",
  bed: "Letto",
  sofa: "Divano",
  armchair: "Poltrona",
  table: "Tavolo",
  chair: "Sedia",
  sideboard: "Madia / credenza",
  bookcase: "Libreria",
  desk: "Scrivania",
  box: "Volume generico",
  imported_model: "Modello importato",
};
