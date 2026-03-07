import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FolderOpen, RefreshCcw, Users, Wallet } from "lucide-react";

import { fetchAdminOverview, type AdminOverviewFilters, type SuperadminOverviewResponse } from "@/api/adminOverview";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAdminDate, formatArs, formatContractStatus, formatCredits, formatEventDates } from "@/components/admin/adminFormatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function AdminOverview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SuperadminOverviewResponse | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const load = async (filters?: AdminOverviewFilters) => {
    try {
      setLoading(true);
      const response = await fetchAdminOverview(filters);
      setData(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el resumen";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildFilters = (): AdminOverviewFilters => ({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    q: search.trim() || undefined,
  });

  useEffect(() => {
    void load();
  }, []);

  const recentContracts = (data?.contracts || []).slice(0, 5);
  const recentTopups = (data?.topups || []).slice(0, 5);
  const recentTransactions = (data?.transactions || []).slice(0, 5);

  return (
    <AdminLayout
      title="Superadmin · Resumen"
      description="Vista ejecutiva del negocio con accesos rapidos a clientes, contratos y packs."
      actions={
        <>
          <Button variant="outline" onClick={() => void load(buildFilters())} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button variant="glow" asChild>
            <Link to="/admin/clients">Gestionar clientes</Link>
          </Button>
        </>
      }
    >
      <section className="glass-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Buscar
            </label>
            <Input
              placeholder="Cliente, empresa, juego o referencia"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
                void load();
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Cargando resumen...</p> : null}

      {!loading && data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Clientes" value={data.summary.clients} hint="Usuarios activos en la plataforma" />
            <AdminStatCard label="Contratos" value={data.summary.contracts} hint="Eventos registrados en el rango actual" />
            <AdminStatCard label="Creditos netos" value={formatCredits(data.summary.credits_totals.neto)} hint="Recargas menos gastos y ajustes" />
            <AdminStatCard label="ARS aprobados" value={formatArs(data.summary.topups_totals.ars_aprobado)} hint={`${data.summary.topups_totals.aprobados} recargas aprobadas`} />
            <AdminStatCard label="Creditos recargados" value={formatCredits(data.summary.credits_totals.recargados)} />
            <AdminStatCard label="Creditos gastados" value={formatCredits(data.summary.credits_totals.gastados)} />
            <AdminStatCard label="Creditos ajustados" value={formatCredits(data.summary.credits_totals.ajustes)} />
            <AdminStatCard label="Creditos aprobados" value={formatCredits(data.summary.topups_totals.creditos_aprobados)} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Link to="/admin/clients" className="glass-card flex flex-col gap-4 p-5 transition-colors hover:border-primary/20 hover:bg-card/80">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Clientes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ver saldos, empresas y acreditar creditos con confirmacion.
                </p>
              </div>
            </Link>

            <Link to="/admin/contracts" className="glass-card flex flex-col gap-4 p-5 transition-colors hover:border-primary/20 hover:bg-card/80">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Contratos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Controlar juegos vendidos, fechas de evento y estado de cada contrato.
                </p>
              </div>
            </Link>

            <Link to="/admin/credit-packs" className="glass-card flex flex-col gap-4 p-5 transition-colors hover:border-primary/20 hover:bg-card/80">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Packs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajustar creditos, descuentos y checkout sin perder claridad operativa.
                </p>
              </div>
            </Link>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="glass-card space-y-3 p-4 xl:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Ultimos contratos</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/contracts">Ver todos</Link>
                </Button>
              </div>
              {recentContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay contratos para mostrar.</p>
              ) : (
                <div className="space-y-3">
                  {recentContracts.map((contract) => (
                    <div key={contract.id} className="rounded-2xl border border-border bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">#{contract.id} · {contract.game_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.client_username} {contract.client_company ? `· ${contract.client_company}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className={statusClass(contract.estado)}>
                          {formatContractStatus(contract.estado)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Evento: {formatEventDates(contract)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Creado: {formatAdminDate(contract.creado_en)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Ultimas recargas</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{data.topups.length} cargadas</p>
              </div>
              {recentTopups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay recargas para mostrar.</p>
              ) : (
                <div className="space-y-3">
                  {recentTopups.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.username}</p>
                          <p className="text-sm text-muted-foreground">{item.pack_name || "Sin pack"}</p>
                        </div>
                        <Badge variant="outline">{item.status_label || item.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.credits} creditos · {formatArs(item.amount_ars)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatAdminDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Ultimos movimientos</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{data.transactions.length} cargados</p>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay movimientos para mostrar.</p>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.username}</p>
                          <p className="text-sm text-muted-foreground">{item.company || "Sin empresa"}</p>
                        </div>
                        <Badge variant="outline">{item.kind_label || item.kind}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatCredits(item.amount)} · {item.reference_type}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatAdminDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </AdminLayout>
  );
}
