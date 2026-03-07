import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { fetchAdminOverview, type AdminOverviewFilters, type SuperadminOverviewResponse } from "@/api/adminOverview";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAdminDate, formatContractStatus, formatEventDates } from "@/components/admin/adminFormatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function statusClass(status: string) {
  switch (status) {
    case "activo":
      return "border-primary/20 bg-primary/10 text-primary";
    case "borrador":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "cancelado":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "finalizado":
      return "border-muted bg-muted/20 text-muted-foreground";
    default:
      return "border-border bg-background/60 text-foreground";
  }
}

export default function AdminContracts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SuperadminOverviewResponse | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [gameSlug, setGameSlug] = useState("");
  const [contractStatus, setContractStatus] = useState("");

  const load = async (filters?: AdminOverviewFilters) => {
    try {
      setLoading(true);
      const response = await fetchAdminOverview(filters);
      setData(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el listado de contratos";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildFilters = (): AdminOverviewFilters => {
    const parsedClientId = clientId ? Number(clientId) : undefined;
    return {
      q: search.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      event_date_from: eventDateFrom || undefined,
      event_date_to: eventDateTo || undefined,
      client_id: Number.isFinite(parsedClientId) ? parsedClientId : undefined,
      game_slug: gameSlug || undefined,
      contract_status: contractStatus || undefined,
    };
  };

  useEffect(() => {
    void load();
  }, []);

  const contracts = data?.contracts || [];
  const activeContracts = useMemo(
    () => contracts.filter((contract) => contract.estado === "activo").length,
    [contracts],
  );
  const uniqueGames = useMemo(
    () => new Set(contracts.map((contract) => contract.game_slug)).size,
    [contracts],
  );
  const uniqueClients = useMemo(
    () => new Set(contracts.map((contract) => contract.client_username)).size,
    [contracts],
  );
  const isTruncated = Boolean(data && data.summary.contracts > contracts.length);

  return (
    <AdminLayout
      title="Superadmin · Contratos"
      description="Seguimiento de juegos contratados, fechas de evento y estados operativos."
      actions={
        <Button variant="outline" onClick={() => void load(buildFilters())} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      }
    >
      <section className="glass-card space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Buscar
            </label>
            <Input placeholder="Cliente, empresa o juego" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Creado desde
            </label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Creado hasta
            </label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Cliente
            </label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Todos</option>
              {(data?.clients || []).map((client) => (
                <option key={client.user_id} value={client.user_id}>
                  {client.username} {client.company ? `· ${client.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Evento desde
            </label>
            <Input type="date" value={eventDateFrom} onChange={(event) => setEventDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Evento hasta
            </label>
            <Input type="date" value={eventDateTo} onChange={(event) => setEventDateTo(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Juego
            </label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={gameSlug} onChange={(event) => setGameSlug(event.target.value)}>
              <option value="">Todos</option>
              {(data?.options.games || []).map((game) => (
                <option key={game.slug} value={game.slug}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Estado
            </label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={contractStatus} onChange={(event) => setContractStatus(event.target.value)}>
              <option value="">Todos</option>
              {(data?.options.contract_statuses || []).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="glow" disabled={loading} onClick={() => void load(buildFilters())}>
            Aplicar filtros
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setEventDateFrom("");
              setEventDateTo("");
              setClientId("");
              setGameSlug("");
              setContractStatus("");
              void load();
            }}
          >
            Limpiar
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Contratos visibles" value={contracts.length} hint={isTruncated ? "La API devolvio una muestra limitada" : "Segun filtros actuales"} />
        <AdminStatCard label="Activos visibles" value={activeContracts} />
        <AdminStatCard label="Clientes visibles" value={uniqueClients} />
        <AdminStatCard label="Juegos visibles" value={uniqueGames} />
      </section>

      <section className="glass-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Listado de contratos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTruncated
                ? `Mostrando ${contracts.length} de ${data?.summary.contracts || 0} contratos. Si necesitas mas volumen, conviene paginar esta API.`
                : "Vista operativa de eventos contratados y costo por partida."}
            </p>
          </div>
          <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
            {data?.summary.contracts || 0} totales
          </Badge>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando contratos...</p>
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se encontraron contratos con los filtros actuales.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Empresa</th>
                  <th className="py-2 pr-3">Juego</th>
                  <th className="py-2 pr-3">Fechas del evento</th>
                  <th className="py-2 pr-3">Creado</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Costo</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-t border-border/70 align-top">
                    <td className="py-3 pr-3 font-medium text-foreground">#{contract.id}</td>
                    <td className="py-3 pr-3">{contract.client_username}</td>
                    <td className="py-3 pr-3">{contract.client_company || "-"}</td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-foreground">{contract.game_name}</p>
                      <p className="text-xs text-muted-foreground">{contract.game_slug}</p>
                    </td>
                    <td className="py-3 pr-3">{formatEventDates(contract)}</td>
                    <td className="py-3 pr-3">{formatAdminDate(contract.creado_en)}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={statusClass(contract.estado)}>
                        {formatContractStatus(contract.estado)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">{contract.costo_por_partida} creditos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
