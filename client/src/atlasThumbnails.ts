interface AtlasFrameEntry {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
}

interface AtlasJson {
  frames: AtlasFrameEntry[];
}

type AtlasKey = "floor_free" | "wall_free" | "decoration_free" | "office_one" | "office_two";

const ATLAS_PATHS: Record<AtlasKey, { png: string; json: string }> = {
  floor_free: {
    png: "/assets/floor/floor_free.png",
    json: "/assets/floor/floor_free.json",
  },
  wall_free: {
    png: "/assets/wall/wall_free.png",
    json: "/assets/wall/wall_free.json",
  },
  decoration_free: {
    png: "/assets/decoration/decoration_free.png",
    json: "/assets/decoration/decoration_free.json",
  },
  office_one: {
    png: "/assets/decoration/office_one.png",
    json: "/assets/decoration/office_one.json",
  },
  office_two: {
    png: "/assets/decoration/office_spritesheet_2.png",
    json: "/assets/decoration/office_sprites_2.json",
  },
};

const FLOOR_ASSETS = new Set([
  "carpet_1", "carpet_2", "carpet_3", "carpet_4", "carpet_5", "carpet_6", "carpet_7", "carpet_8",
  "grass_1", "grass_2", "grass_3", "grass_4",
  "marble_1", "marble_2", "marble_3", "marble_4",
  "stone_1", "stone_2", "stone_3", "stone_4", "stone_5", "stone_6", "stone_7", "stone_8",
  "wood_1", "wood_2", "wood_3", "wood_4", "wood_5", "wood_6",
]);

const GLASS_WALL_ASSETS = new Set(["glass_1", "glass_2", "glass_3", "glass_4"]);

const DECO_FREE_ASSETS = new Set([
  "table_1_left", "table_1_middle", "table_1_right",
  "table_2_left", "table_2_middle", "table_2_right",
  "round_table_1", "typewriter_1", "ashtray_1", "chess_board_1", "aquarium_1",
  "office_chair_1_front", "office_chair_1_back", "jukebox_1",
]);

interface LoadedAtlas {
  image: HTMLImageElement;
  frames: Map<string, { x: number; y: number; w: number; h: number }>;
}

const atlasLoadCache = new Map<AtlasKey, Promise<LoadedAtlas>>();
const frameDataUrlCache = new Map<string, string>();

function normalizeFloorKey(key: string): string {
  if (key === "grass_150" || key === "grass_100" || key === "grass_tile") return "grass_4";
  return key;
}

function normalizeDecoKey(key: string): string {
  if (key === "aquarium") return "aquarium_1";
  if (key === "chess_board") return "chess_board_1";
  if (key === "table_left_150") return "table_2_left";
  if (key === "table_middle_150") return "table_2_middle";
  if (key === "table_right_150") return "table_2_right";
  if (key === "round_table_150") return "round_table_1";
  if (key === "office_chair_150") return "office_chair_1_front";
  if (key === "office_chair_back_150") return "office_chair_1_back";
  if (key === "jukebox_150") return "jukebox_1";
  if (key === "typewriter_150") return "typewriter_1";
  return key;
}

function resolveAtlasTarget(assetId: string): { atlas: AtlasKey; frame: string } | null {
  const normalized = normalizeDecoKey(normalizeFloorKey(assetId));
  if (FLOOR_ASSETS.has(normalized)) {
    return { atlas: "floor_free", frame: normalized };
  }
  if (GLASS_WALL_ASSETS.has(normalized)) {
    return { atlas: "wall_free", frame: normalized };
  }
  if (normalized.startsWith("wood_wall_")) {
    return { atlas: "wall_free", frame: `wood_${normalized.slice("wood_wall_".length)}` };
  }
  if (normalized.startsWith("wall_wood_")) {
    return { atlas: "wall_free", frame: `wood_${normalized.slice("wall_wood_".length)}` };
  }
  if (DECO_FREE_ASSETS.has(normalized)) {
    return { atlas: "decoration_free", frame: normalized };
  }
  if (normalized.startsWith("office_one/")) {
    return { atlas: "office_one", frame: normalized.slice("office_one/".length) };
  }
  if (normalized.startsWith("office_two/")) {
    return { atlas: "office_two", frame: normalized.slice("office_two/".length) };
  }
  return null;
}

function loadAtlas(atlasKey: AtlasKey): Promise<LoadedAtlas> {
  const existing = atlasLoadCache.get(atlasKey);
  if (existing) return existing;

  const { png, json } = ATLAS_PATHS[atlasKey];
  const promise = Promise.all([
    fetch(json).then((r) => {
      if (!r.ok) throw new Error(`Failed to load atlas JSON: ${json}`);
      return r.json() as Promise<AtlasJson>;
    }),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load atlas PNG: ${png}`));
      img.src = png;
    }),
  ]).then(([atlasJson, image]) => {
    const frames = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const entry of atlasJson.frames) {
      frames.set(entry.filename, entry.frame);
    }
    return { image, frames };
  });

  atlasLoadCache.set(atlasKey, promise);
  return promise;
}

/**
 * Crops and caches a PNG data URL for a given asset ID from its packed texture atlas.
 */
export async function resolveAssetThumbnailUrl(assetId: string): Promise<string | null> {
  const target = resolveAtlasTarget(assetId);
  if (!target) return null;

  const cacheKey = `${target.atlas}:${target.frame}`;
  const cached = frameDataUrlCache.get(cacheKey);
  if (cached) return cached;

  try {
    const loaded = await loadAtlas(target.atlas);
    const rect = loaded.frames.get(target.frame);
    if (!rect) return null;

    const canvas = document.createElement("canvas");
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(loaded.image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const dataUrl = canvas.toDataURL("image/png");
    frameDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Populates all `.editor-asset-card` thumbnail `<img>` elements from packed atlases.
 */
export function hydrateEditorAssetThumbnails(root: ParentNode = document): void {
  const cards = root.querySelectorAll<HTMLElement>(".editor-asset-card[data-asset-id]");
  for (const card of cards) {
    const assetId = card.dataset.assetId;
    const img = card.querySelector<HTMLImageElement>("img.asset-thumb-img");
    if (!assetId || !img) continue;
    void resolveAssetThumbnailUrl(assetId).then((url) => {
      if (url) img.src = url;
    });
  }
}
