import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AdminOverviewFilters, fetchAdminOverview, SuperadminOverviewResponse } from "@/api/adminOverview";

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-AR");
  } catch {
    return value;
  }
}

function formatEventDates(contract: SuperadminOverviewResponse["contracts"][number]) {
  const eventDates = (contract.fechas_evento || []).slice().sort();
  if (eventDates.length === 1) return eventDates[0];
  if (eventDates.length > 1) return eventDates.join(" · ");
  if (contract.fecha_inicio === contract.fecha_fin) return contract.fecha_inicio;
  return `${contract.fecha_inicio} → ${contract.fecha_fin}`;
}

export default function AdminOverview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SuperadminOverviewResponse | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [gameSlug, setGameSlug] = useState("");
  const [contractStatus, setContractStatus] = useState("");
  const [transactionKind, setTransactionKind] = useState("");
  const [topupStatus, setTopupStatus] = useState("");

  const load = async (filters?: AdminOverviewFilters) => {
    try {
      setLoading(true);
      const res = await fetchAdminOverview(filters);
      setData(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el panel";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildFilters = (): AdminOverviewFilters => {
    const parsedClientId = clientId ? Number(clientId) : undefined;
    return {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      event_date_from: eventDateFrom || undefined,
      event_date_to: eventDateTo || undefined,
      client_id: Number.isFinite(parsedClientId) ? parsedClientId : undefined,
      game_slug: gameSlug || undefined,
      contract_status: contractStatus || undefined,
      transaction_kind: transactionKind || undefined,
      topup_status: topupStatus || undefined,
      q: search.trim() || undefined,
    };
  };

  const applyFilters = () => {
    void load(buildFilters());
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setEventDateFrom("");
    setEventDateTo("");
    setSearch("");
    setClientId("");
    setGameSlug("");
    setContractStatus("");
    setTransactionKind("");
    setTopupStatus("");
    void load();
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Superadmin · Overview</h1>
          <p className="text-muted-foreground mt-1">Clientes, contratos por fecha y movimientos de billetera.</p>
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input
                placeholder="Cliente, empresa, juego o referencia"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Creado desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Creado hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cliente</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Todos</option>
                {(data?.clients || []).map((client) => (
                  <option key={client.user_id} value={client.user_id}>
                    {client.username} {client.company ? `· ${client.company}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Fecha de evento desde</label>
              <Input type="date" value={eventDateFrom} onChange={(e) => setEventDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha de evento hasta</label>
              <Input type="date" value={eventDateTo} onChange={(e) => setEventDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Juego</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={gameSlug}
                onChange={(e) => setGameSlug(e.target.value)}
              >
                <option value="">Todos</option>
                {(data?.options.games || []).map((game) => (
                  <option key={game.slug} value={game.slug}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Estado contrato</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {(data?.options.contract_statuses || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo transacción</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={transactionKind}
                onChange={(e) => setTransactionKind(e.target.value)}
              >
                <option value="">Todos</option>
                {(data?.options.transaction_kinds || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Estado topup</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={topupStatus}
                onChange={(e) => setTopupStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {(data?.options.topup_statuses || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-4 flex gap-2">
              <Button variant="glow" disabled={loading} onClick={applyFilters}>
                {loading ? "Filtrando..." : "Aplicar filtros"}
              </Button>
              <Button variant="outline" disabled={loading} onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Cargando panel...</p>}

        {!loading && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground uppercase">Clientes</p>
                <p className="text-2xl font-bold">{data.summary.clients}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground uppercase">Contratos</p>
                <p className="text-2xl font-bold">{data.summary.contracts}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground uppercase">Mov. Wallet</p>
                <p className="text-2xl font-bold">{data.summary.ledger_entries}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground uppercase">Topups</p>
                <p className="text-2xl font-bold">{data.summary.topups}</p>
              </div>
            </div>

            <section className="glass-card p-4 space-y-3">
              <h2 className="text-lg font-semibold">Contratos recientes</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Empresa</th>
                      <th className="py-2 pr-3">Juego</th>
                      <th className="py-2 pr-3">Fechas evento</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contracts.map((contract) => (
                      <tr key={contract.id} className="border-t border-border">
                        <td className="py-2 pr-3">{contract.id}</td>
                        <td className="py-2 pr-3">{contract.client_username}</td>
                        <td className="py-2 pr-3">{contract.client_company || "—"}</td>
                        <td className="py-2 pr-3">{contract.game_name}</td>
                        <td className="py-2 pr-3">{formatEventDates(contract)}</td>
                        <td className="py-2 pr-3">{contract.estado}</td>
                        <td className="py-2 pr-3">{contract.costo_por_partida} créditos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-card p-4 space-y-3">
              <h2 className="text-lg font-semibold">Clientes</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Empresa</th>
                      <th className="py-2 pr-3">Saldo</th>
                      <th className="py-2 pr-3">Alta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clients.map((client) => (
                      <tr key={client.user_id} className="border-t border-border">
                        <td className="py-2 pr-3">{client.username}</td>
                        <td className="py-2 pr-3">{client.email || "—"}</td>
                        <td className="py-2 pr-3">{client.company || "—"}</td>
                        <td className="py-2 pr-3">{client.wallet_balance} créditos</td>
                        <td className="py-2 pr-3">{formatDate(client.joined_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-card p-4 space-y-3">
              <h2 className="text-lg font-semibold">Historial de transacciones</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Empresa</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Monto</th>
                      <th className="py-2 pr-3">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((item) => (
                      <tr key={`tx-${item.id}`} className="border-t border-border">
                        <td className="py-2 pr-3">{formatDate(item.created_at)}</td>
                        <td className="py-2 pr-3">{item.username}</td>
                        <td className="py-2 pr-3">{item.company || "—"}</td>
                        <td className="py-2 pr-3">{item.kind}</td>
                        <td className="py-2 pr-3">{item.amount}</td>
                        <td className="py-2 pr-3">
                          {item.reference_type} · {item.reference_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-card p-4 space-y-3">
              <h2 className="text-lg font-semibold">Topups / recargas</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Empresa</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Pack</th>
                      <th className="py-2 pr-3">Créditos</th>
                      <th className="py-2 pr-3">Monto ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topups.map((item) => (
                      <tr key={`topup-${item.id}`} className="border-t border-border">
                        <td className="py-2 pr-3">{formatDate(item.created_at)}</td>
                        <td className="py-2 pr-3">{item.username}</td>
                        <td className="py-2 pr-3">{item.company || "—"}</td>
                        <td className="py-2 pr-3">{item.status}</td>
                        <td className="py-2 pr-3">{item.pack_name || "—"}</td>
                        <td className="py-2 pr-3">{item.credits}</td>
                        <td className="py-2 pr-3">{item.amount_ars}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
