import { Game } from "@/types";
import { ApiGame } from "@/api/games";

const FALLBACK_IMAGE_BY_SLUG: Record<string, string> = {
  trivia: "/img/trivia-normal.svg",
  "trivia-sparkle": "/img/trivia-sparkle.svg",
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const match = normalized.match(/(\d+(\.\d+)?)/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapCategory(tags?: string[]): Game["category"] {
  const t = (tags || []).map((s) => s.toLowerCase());
  if (t.includes("trivia") || t.includes("quiz")) return "trivia";
  if (t.includes("multiplayer")) return "multiplayer";
  if (t.includes("social")) return "social";
  if (t.includes("touchscreen") || t.includes("touchscreens")) return "touchscreen";
  if (t.includes("ar") || t.includes("vr") || t.includes("ar/vr")) return "ar-vr";
  return "interactive";
}

function buildMiniBio(description: string, shortDescription: string): string {
  const base = shortDescription || description || "Sin descripción";
  const clean = base.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177)}...`;
}

function resolveCoverImage(api: ApiGame): string {
  const remoteImage = (api.imagen_portada || "").trim();
  if (remoteImage) return remoteImage;
  return FALLBACK_IMAGE_BY_SLUG[api.slug] || "/placeholder.svg";
}

export function mapApiGameToGame(api: ApiGame): Game {
  const description = api.descripcion || "";
  const shortDescription = (api.descripcion || "").slice(0, 120);

  const creditsCost = parseNumber(api.costo_por_partida) ?? parseNumber(api.precio) ?? 0;

  return {
    id: String(api.slug || crypto.randomUUID()),
    name: api.nombre || "Juego",
    description,
    shortDescription: shortDescription || description || "Sin descripción",
    miniBio: buildMiniBio(description, shortDescription),
    image: resolveCoverImage(api),
    category: mapCategory(api.tags),
    modality: [],
    pricing: {
      type: "per-event",
      price: creditsCost,
      currency: "CREDITS",
      period: "event",
    },
    creditsCost,
    features: [],
    isPopular: Boolean(api.destacado),
    isNew: false,
  };
}
