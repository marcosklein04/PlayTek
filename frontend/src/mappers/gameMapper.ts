import { Game, GameCategory } from "@/types";
import { ApiGame } from "@/api/games";


function parsePrice(raw?: string): number {
  if (!p) return 0;
  const m = p.replace(",", ".").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function mapCategory(tags?: string[]): Game["category"] {
  const t = (tags || []).map(s => s.toLowerCase());
  if (t.includes("trivia") || t.includes("quiz")) return "trivia";
  if (t.includes("multiplayer")) return "multiplayer";
  if (t.includes("social")) return "social";
  if (t.includes("touchscreen") || t.includes("touchscreens")) return "touchscreen";
  if (t.includes("ar") || t.includes("vr") || t.includes("ar/vr")) return "ar-vr";
  return "interactive";
}


function pickPricing(api: ApiGame): GamePricing {
  const price = parsePrice(api.precio);

  // Si el texto contiene "/partida" lo tratamos como one-time por juego/partida
  const raw = (api.precio || "").toLowerCase();
  const isPerPlay = raw.includes("partida");

  return {
    type: isPerPlay ? "one-time" : "per-event",
    price,
    currency: "USD",
    period: isPerPlay ? undefined : "event",
  };
}

export function mapApiGameToGame(api: any): Game {
  return {
    id: String(api.id ?? api.slug ?? api.codigo ?? crypto.randomUUID()),
    name: api.nombre ?? api.name ?? "Juego",
    shortDescription: api.descripcion_corta ?? api.short_description ?? "",
    description: api.descripcion ?? api.description ?? "",
    category: api.categoria ?? api.category ?? "all",
    image: api.imagen ?? api.image ?? "/placeholder.png",
    isPopular: Boolean(api.popular ?? api.is_popular ?? false),
    isNew: Boolean(api.nuevo ?? api.is_new ?? false),
    modality: Array.isArray(api.modalidad ?? api.modality) ? (api.modalidad ?? api.modality) : [],
    features: Array.isArray(api.features) ? api.features : [],
    pricing: {
      price: Number(api.precio ?? api.pricing?.price ?? 0),
      period: api.periodo ?? api.pricing?.period,
      type: api.tipo ?? api.pricing?.type ?? "subscription",
    },
  };
}
