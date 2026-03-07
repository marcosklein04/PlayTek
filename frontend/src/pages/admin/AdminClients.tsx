import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, Wallet } from "lucide-react";

import { fetchAdminOverview, type AdminOverviewFilters, type SuperadminOverviewResponse } from "@/api/adminOverview";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AssignCreditsDialog } from "@/components/admin/AssignCreditsDialog";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatAdminDate, formatCredits } from "@/components/admin/adminFormatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminClients() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SuperadminOverviewResponse | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const load = async (filters?: AdminOverviewFilters) => {
    try {
      setLoading(true);
      const response = await fetchAdminOverview(filters);
      setData(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el listado de clientes";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildFilters = (): AdminOverviewFilters => ({
    q: search.trim() || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  useEffect(() => {
    void load();
  }, []);

  const clients = data?.clients || [];
  const totalBalance = useMemo(
    () => clients.reduce((sum, client) => sum + Number(client.wallet_balance || 0), 0),
    [clients],
  );
  const companiesCount = useMemo(
    () => new Set(clients.map((client) => client.company).filter(Boolean)).size,
    [clients],
  );
  const clientsWithEmail = useMemo(
    () => clients.filter((client) => Boolean(client.email)).length,
    [clients],
  );

  return (
    <AdminLayout
      title="Superadmin · Clientes"
      description="Panel operativo para revisar cuentas, empresas y saldos antes de intervenir sobre la billetera."
      actions={
        <>
          <Button variant="outline" onClick={() => void load(buildFilters())} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button
            variant="glow"
            onClick={() => {
              setSelectedClientId(null);
              setDialogOpen(true);
            }}
          >
            Acreditar creditos
          </Button>
        </>
      }
    >
      <section className="glass-card space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr,1fr,1fr,auto]">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Buscar cliente o empresa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nombre, email o empresa" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Alta desde
            </label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Alta hasta
            </label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="glow" disabled={loading} onClick={() => void load(buildFilters())}>
              Aplicar
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Clientes visibles" value={clients.length} hint="Segun filtros aplicados" />
        <AdminStatCard label="Saldo total visible" value={formatCredits(totalBalance)} />
        <AdminStatCard label="Empresas visibles" value={companiesCount} />
        <AdminStatCard label="Con email cargado" value={clientsWithEmail} />
      </section>

      <section className="glass-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Listado de clientes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Antes de acreditar creditos, revisa empresa, email y saldo actual.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
            {clients.length} registros
          </Badge>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando clientes...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se encontraron clientes con los filtros actuales.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Empresa</th>
                  <th className="py-2 pr-3">Saldo</th>
                  <th className="py-2 pr-3">Alta</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.user_id} className="border-t border-border/70 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-foreground">{client.username}</p>
                    </td>
                    <td className="py-3 pr-3">{client.email || "-"}</td>
                    <td className="py-3 pr-3">{client.company || "-"}</td>
                    <td className="py-3 pr-3">
                      <span className="font-medium text-primary">{formatCredits(client.wallet_balance)}</span>
                    </td>
                    <td className="py-3 pr-3">{formatAdminDate(client.joined_at)}</td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClientId(client.user_id);
                          setDialogOpen(true);
                        }}
                      >
                        <Wallet className="h-4 w-4" />
                        Acreditar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AssignCreditsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        initialClientId={selectedClientId}
        onAssigned={() => load(buildFilters())}
      />
    </AdminLayout>
  );
}
