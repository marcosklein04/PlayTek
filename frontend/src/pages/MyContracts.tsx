import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ContractGame, fetchMyContracts, launchContractByDate } from "@/api/contracts";

function estadoLabel(estado: string) {
  switch (estado) {
    case "activo":
      return "Activo";
    case "cancelado":
      return "Cancelado";
    case "finalizado":
      return "Finalizado";
    case "borrador":
      return "Borrador";
    default:
      return estado;
  }
}

function contratoDisponible(estado: string) {
  return estado !== "cancelado" && estado !== "finalizado";
}

export default function MyContracts() {
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [contracts, setContracts] = useState<ContractGame[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchMyContracts();
        setContracts(res.resultados || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error cargando contratos";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleLaunch = async (contractId: number) => {
    try {
      setLaunchingId(contractId);
      const res = await launchContractByDate(contractId);
      if (res.preview_mode) {
        toast({
          title: "Modo preview",
          description: "Fuera del rango del evento: abrimos con watermark.",
        });
      }
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el juego";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Mis Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Contratos activos y configuracion para el dia del evento.
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Cargando contratos...</p>}

        {!loading && contracts.length === 0 && (
          <div className="glass-card p-6">
            <p className="text-sm text-muted-foreground">
              Todavia no tenes contratos. Contrata un juego desde el catalogo.
            </p>
            <Button className="mt-4" variant="glow" onClick={() => navigate("/catalog")}>
              Ir al catalogo
            </Button>
          </div>
        )}

        {!loading && contracts.length > 0 && (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="glass-card p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{contract.juego.nombre}</h2>
                    <Badge variant="secondary">{estadoLabel(contract.estado)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(() => {
                      const fechasEvento = (contract.fechas_evento || []).slice().sort();
                      if (fechasEvento.length === 1) return `Fecha del evento: ${fechasEvento[0]}`;
                      if (fechasEvento.length > 1) return `Fechas del evento: ${fechasEvento.join(" · ")}`;
                      if (contract.fecha_inicio === contract.fecha_fin) return `Fecha del evento: ${contract.fecha_inicio}`;
                      return `${contract.fecha_inicio} hasta ${contract.fecha_fin}`;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima customizacion: {contract.customization_updated_at || "Sin customizar"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="hero"
                    disabled={launchingId === contract.id || !contratoDisponible(contract.estado)}
                    onClick={() => void handleLaunch(contract.id)}
                  >
                    {launchingId === contract.id ? "Abriendo..." : "Iniciar segun fecha"}
                  </Button>
                  <Button
                    variant="glow"
                    onClick={() => navigate(`/contracts/${contract.id}/customize`)}
                  >
                    Personalizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
