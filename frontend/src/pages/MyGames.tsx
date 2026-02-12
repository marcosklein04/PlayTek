import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/Sidebar";
import { fetchMyContracts, launchContractByDate, ContractGame } from "@/api/contracts";
import { useToast } from "@/hooks/use-toast";

export default function MyGames() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractGame[]>([]);
  const [launchingContractId, setLaunchingContractId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const contractsRes = await fetchMyContracts();
        setContracts(contractsRes.resultados || []);
      } catch (e: any) {
        toast({
          title: "Error cargando Mis Juegos",
          description: e.message || "Error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleLaunchContract = async (contractId: number) => {
    try {
      setLaunchingContractId(contractId);
      const res = await launchContractByDate(contractId);
      if (res.preview_mode) {
        toast({
          title: "Modo preview",
          description: "Fuera de fecha de evento: abrimos con watermark.",
        });
      }
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el juego";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLaunchingContractId(null);
    }
  };

  const estadoContratoLabel = (estado: string) => {
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
  };

  const contratoDisponible = (estado: string) => estado !== "cancelado" && estado !== "finalizado";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold text-foreground">
            Mis Juegos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y opera tus juegos contratados
          </p>
        </motion.div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando mis juegos...</p>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Juegos contratados</h2>
                <p className="text-sm text-muted-foreground">Aquí gestionas tus contratos y la personalización.</p>
              </div>

              {contracts.length === 0 ? (
                <div className="glass-card p-5">
                  <p className="text-sm text-muted-foreground">
                    Todavia no tenes juegos contratados. Contrata uno desde el catalogo.
                  </p>
                  <Button className="mt-4" variant="glow" onClick={() => navigate("/catalog")}>
                    Ir al catalogo
                  </Button>
                </div>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="glass-card p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{contract.juego.nombre}</h3>
                        <Badge variant="secondary">{estadoContratoLabel(contract.estado)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.fecha_inicio === contract.fecha_fin
                          ? `Fecha del evento: ${contract.fecha_inicio}`
                          : `${contract.fecha_inicio} hasta ${contract.fecha_fin}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ultima customizacion: {contract.customization_updated_at || "Sin customizar"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="hero"
                        disabled={launchingContractId === contract.id || !contratoDisponible(contract.estado)}
                        onClick={() => void handleLaunchContract(contract.id)}
                      >
                        {launchingContractId === contract.id ? "Abriendo..." : "Iniciar segun fecha"}
                      </Button>
                      <Button
                        variant="glow"
                        onClick={() => navigate(`/contracts/${contract.id}/customize`)}
                      >
                        Personalizar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
