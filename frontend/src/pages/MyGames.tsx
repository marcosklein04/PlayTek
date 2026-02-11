import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Settings,
  ExternalLink,
  Calendar,
  Gamepad2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/Sidebar";
import { fetchMySessions } from "@/api/games";
import { useToast } from "@/hooks/use-toast";

type SessionItem = any;

/**
 * Mapea lo que venga del backend a un objeto "renderizable" sin romper si cambian nombres.
 * Cuando me pegues el JSON real, lo dejamos perfecto con types.
 */
function normalizeSession(s: SessionItem) {
  const juego = s.juego || s.game || s.juego_detalle || {};
  const pricing = juego.pricing || juego.precio || {};

  const name =
    juego.nombre ||
    juego.name ||
    s.juego_nombre ||
    s.game_name ||
    "Juego";

  const image =
    juego.imagen_portada ||
    juego.image ||
    juego.imagen ||
    "/placeholder.png";

  const category =
    juego.categoria ||
    juego.category ||
    s.categoria ||
    "sin-categoría";

  const shortDescription =
    juego.descripcion_corta ||
    juego.shortDescription ||
    juego.descripcion ||
    "—";

  const status =
    s.estado ||
    s.status ||
    (s.finalizada || s.finished ? "finished" : "active");

  const contractedAtRaw =
    s.creado_en || s.created_at || s.createdAt || s.fecha || null;

  const contractedAt = contractedAtRaw ? new Date(contractedAtRaw) : null;

  // Runner / operar
  const runnerUrl =
    s.runner_url ||
    juego.runner_url ||
    juego.runnerUrl ||
    null;

  // precio (si existe)
  const price =
    pricing.price ??
    juego.precio ??
    null;

  const period =
    pricing.period ??
    (juego.periodo ? juego.periodo : null);

  const modality =
    juego.modalidad || juego.modality || juego.modes || [];

  return {
    id: String(s.id_sesion || s.session_id || s.id || `${name}-${Math.random()}`),
    name,
    image,
    category,
    shortDescription,
    status,
    contractedAt,
    runnerUrl,
    pricing: { price, period },
    modality: Array.isArray(modality) ? modality : [],
  };
}

export default function MyGames() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchMySessions();
        setSessions(res.resultados || []);
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

  const games = useMemo(() => sessions.map(normalizeSession), [sessions]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);

  const handleOperate = (runnerUrl: string | null) => {
    if (!runnerUrl) {
      toast({
        title: "No se puede operar",
        description: "Este juego/sesión no tiene runner_url disponible.",
      });
      return;
    }
    window.location.href = runnerUrl;
  };

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
            Gestiona y opera tus juegos (sesiones) contratados
          </p>
        </motion.div>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Cargando mis juegos...
          </p>
        ) : games.length > 0 ? (
          <div className="space-y-4">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image */}
                  <div className="relative lg:w-48 aspect-video lg:aspect-square rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <Badge className="absolute bottom-2 left-2 bg-success/90 text-foreground border-0">
                      {game.status === "active" ? "Activo" : game.status}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-display font-semibold text-xl text-foreground">
                        {game.name}
                      </h3>

                      {game.pricing.price != null ? (
                        <span className="text-primary font-bold whitespace-nowrap">
                          ${game.pricing.price} USD
                          {game.pricing.period ? `/${game.pricing.period}` : ""}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {game.shortDescription}
                    </p>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      {game.contractedAt ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Contratado el {formatDate(game.contractedAt)}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <Gamepad2 className="w-4 h-4" />
                        {game.category}
                      </div>
                    </div>

                    {/* Modalities */}
                    {game.modality.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {game.modality.map((mod: string) => (
                          <span
                            key={mod}
                            className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                          >
                            {String(mod).replace("-", " ")}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={() => handleOperate(game.runnerUrl)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Operar juego
                      </Button>

                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() =>
                          toast({
                            title: "Pendiente",
                            description: "Configurar todavía no está implementado.",
                          })
                        }
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configurar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toast({
                            title: "Pendiente",
                            description: "Instrucciones todavía no está implementado.",
                          })
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Instrucciones
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-accent/20 flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">
              Aún no tienes juegos
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Explora nuestro catálogo y contrata tu primer juego para empezar.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate("/catalog")}>
              Explorar catálogo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}