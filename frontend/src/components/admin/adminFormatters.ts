import type { SuperadminOverviewResponse } from "@/api/adminOverview";

export function formatAdminDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-AR");
  } catch {
    return value;
  }
}

export function formatCredits(value?: number | null) {
  return `${Number(value || 0).toLocaleString("es-AR")} creditos`;
}

export function formatArs(value?: string | number | null) {
  const parsed = Number(value || 0);
  return `$${parsed.toLocaleString("es-AR")} ARS`;
}

export function formatEventDates(contract: SuperadminOverviewResponse["contracts"][number]) {
  const eventDates = (contract.fechas_evento || []).slice().sort();
  if (eventDates.length === 1) return eventDates[0];
  if (eventDates.length > 1) return eventDates.join(" · ");
  if (contract.fecha_inicio === contract.fecha_fin) return contract.fecha_inicio;
  return `${contract.fecha_inicio} -> ${contract.fecha_fin}`;
}

export function formatContractStatus(value?: string | null) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
