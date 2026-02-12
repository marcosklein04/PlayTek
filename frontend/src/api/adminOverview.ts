import { apiFetch } from "@/api/client";

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
  };
  clients: Array<{
    user_id: number;
    username: string;
    email: string;
    company: string;
    joined_at: string | null;
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

export async function fetchAdminOverview(params?: { date_from?: string; date_to?: string }) {
  const search = new URLSearchParams();
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<SuperadminOverviewResponse>(`/api/admin/overview${suffix}`, {
    method: "GET",
  });
}
