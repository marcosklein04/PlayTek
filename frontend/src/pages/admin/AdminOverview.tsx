import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchAdminOverview, SuperadminOverviewResponse } from "@/api/adminOverview";

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-AR");
  } catch {
    return value;
  }
}

export default function AdminOverview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<SuperadminOverviewResponse | null>(null);

  const load = async (filters?: { date_from?: string; date_to?: string }) => {
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

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Superadmin · Overview</h1>
          <p className="text-muted-foreground mt-1">Clientes, contratos por fecha y transacciones.</p>
        </div>

        <div className="glass-card p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button
            variant="glow"
            disabled={loading}
            onClick={() => void load({ date_from: dateFrom || undefined, date_to: dateTo || undefined })}
          >
            {loading ? "Filtrando..." : "Aplicar filtro"}
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              void load();
            }}
          >
            Limpiar
          </Button>
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
                      <th className="py-2 pr-3">Fecha evento</th>
                      <th className="py-2 pr-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contracts.slice(0, 120).map((contract) => (
                      <tr key={contract.id} className="border-t border-border">
                        <td className="py-2 pr-3">{contract.id}</td>
                        <td className="py-2 pr-3">{contract.client_username}</td>
                        <td className="py-2 pr-3">{contract.client_company || "—"}</td>
                        <td className="py-2 pr-3">{contract.game_name}</td>
                        <td className="py-2 pr-3">
                          {contract.fecha_inicio === contract.fecha_fin
                            ? contract.fecha_inicio
                            : `${contract.fecha_inicio} → ${contract.fecha_fin}`}
                        </td>
                        <td className="py-2 pr-3">{contract.estado}</td>
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
                      <th className="py-2 pr-3">Alta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clients.map((client) => (
                      <tr key={client.user_id} className="border-t border-border">
                        <td className="py-2 pr-3">{client.username}</td>
                        <td className="py-2 pr-3">{client.email || "—"}</td>
                        <td className="py-2 pr-3">{client.company || "—"}</td>
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
                    {data.transactions.slice(0, 150).map((item) => (
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
                      <th className="py-2 pr-3">Créditos</th>
                      <th className="py-2 pr-3">Monto ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topups.slice(0, 120).map((item) => (
                      <tr key={`topup-${item.id}`} className="border-t border-border">
                        <td className="py-2 pr-3">{formatDate(item.created_at)}</td>
                        <td className="py-2 pr-3">{item.username}</td>
                        <td className="py-2 pr-3">{item.company || "—"}</td>
                        <td className="py-2 pr-3">{item.status}</td>
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
