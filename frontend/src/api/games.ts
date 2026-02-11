import { apiFetch } from "@/api/client";
import { ContractedGame, Game } from "@/types";

export type ApiGame = {
  slug: string;
  nombre: string;
  descripcion?: string;
  imagen_portada?: string;
  runner_url?: string;
  precio?: string;
  costo_por_partida?: number;
  destacado?: boolean;
  habilitado?: boolean;
  tags?: string[];
};

export type ApiSession = {
  id: string;
  estado: "active" | "finished" | string;
  iniciado_en: string;
  finalizado_en: string | null;
  costo_cobrado: number;
  juego: { slug: string; nombre: string };
};

export async function fetchGames() {
  return apiFetch<{ resultados: ApiGame[] }>("/api/catalogo/juegos");
}

export async function startGame(slug: string) {
  return apiFetch<{
    juego: { slug: string; nombre: string; runner_url: string };
    costo_cobrado: number;
    saldo_restante: number;
    id_sesion: string;
  }>(`/api/juegos/${slug}/iniciar`, {
    method: "POST",
  });
}

export async function fetchMySessions() {
  return apiFetch<{ resultados: ApiSession[] }>("/api/juegos/sesiones");
}