import { apiFetch } from "@/api/client";

export type AdminOverviewFilters = {
  date_from?: string;
  date_to?: string;
  event_date_from?: string;
  event_date_to?: string;
  client_id?: number;
  game_slug?: string;
  contract_status?: string;
  transaction_kind?: string;
  topup_status?: string;
  q?: string;
};

export type SuperadminOverviewResponse = {
  ok: boolean;
  summary: {
    clients: number;
    contracts: number;
    ledger_entries: number;
    topups: number;
  };
  filters: {
    date_from: string | null;
    date_to: string | null;
    event_date_from: string | null;
    event_date_to: string | null;
    client_id: number | null;
    game_slug: string | null;
    contract_status: string | null;
    transaction_kind: string | null;
    topup_status: string | null;
    q: string | null;
  };
  options: {
    games: Array<{ slug: string; name: string }>;
    contract_statuses: Array<{ value: string; label: string }>;
    transaction_kinds: Array<{ value: string; label: string }>;
    topup_statuses: Array<{ value: string; label: string }>;
  };
  clients: Array<{
    user_id: number;
    username: string;
    email: string;
    company: string;
    joined_at: string | null;
    wallet_balance: number;
  }>;
  contracts: Array<{
    id: number;
    client_username: string;
    client_company: string;
    game_slug: string;
    game_name: string;
    fecha_inicio: string;
    fecha_fin: string;
    fechas_evento?: string[];
    estado: string;
    costo_por_partida: number;
    creado_en: string | null;
  }>;
  transactions: Array<{
    id: number;
    source: "ledger";
    kind: string;
    amount: number;
    reference_type: string;
    reference_id: string;
    username: string;
    company: string;
    created_at: string | null;
  }>;
  topups: Array<{
    id: number;
    pack_id: number | null;
    username: string;
    company: string;
    status: string;
    credits: number;
    amount_ars: string;
    pack_name: string;
    created_at: string | null;
    approved_at: string | null;
  }>;
};

export async function fetchAdminOverview(params?: AdminOverviewFilters) {
  const search = new URLSearchParams();
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);
  if (params?.event_date_from) search.set("event_date_from", params.event_date_from);
  if (params?.event_date_to) search.set("event_date_to", params.event_date_to);
  if (params?.client_id) search.set("client_id", String(params.client_id));
  if (params?.game_slug) search.set("game_slug", params.game_slug);
  if (params?.contract_status) search.set("contract_status", params.contract_status);
  if (params?.transaction_kind) search.set("transaction_kind", params.transaction_kind);
  if (params?.topup_status) search.set("topup_status", params.topup_status);
  if (params?.q) search.set("q", params.q);

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<SuperadminOverviewResponse>(`/api/admin/overview${suffix}`, {
    method: "GET",
  });
}
