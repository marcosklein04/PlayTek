import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { GameCard } from "@/components/GameCard";
import { GameDetailModal } from "@/components/GameDetailModal";
import { useAuth } from "@/context/AuthContext";
import { fetchGames, previewGame } from "@/api/games";
import { Game } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { mapApiGameToGame } from "@/mappers/gameMapper";
import { PurchaseFlowModal } from "@/components/PurchaseFlowModal";
import { useLocation, useNavigate } from "react-router-dom";
import { isGameAvailable } from "@/lib/gameAvailability";

export default function Catalog() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [contractGame, setContractGame] = useState<Game | null>(null);

  const { user, contractedGames, refreshContractedGames } = useAuth();
  const { toast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const notifyUnavailableGame = useCallback(() => {
    toast({
      title: "Próximamente",
      description: "este juego no esta disponible",
      variant: "destructive",
    });
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { resultados } = await fetchGames();
        setGames(resultados.map(mapApiGameToGame));
      } catch (e: any) {
        toast({ title: "Error cargando catálogo", description: e.message || "Error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!games.length) return;

    const params = new URLSearchParams(location.search);
    const openGame = (params.get("open_game") || "").trim();
    if (!openGame) return;

    const gameToOpen = games.find((game) => game.id === openGame);
    if (!gameToOpen) return;

    if (!isGameAvailable(gameToOpen.id, user?.role)) {
      notifyUnavailableGame();
      params.delete("open_game");
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true },
      );
      return;
    }

    setSelectedGame(gameToOpen);
    setContractGame(null);

    params.delete("open_game");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [games, location.pathname, location.search, navigate, notifyUnavailableGame, user?.role]);

  const filteredGames = useMemo(() => {
    return games;
  }, [games]);

  const handleOpenContract = (gameId: string) => {
    const g = games.find((x) => x.id === gameId) || null;
    if (g && !isGameAvailable(g.id, user?.role)) {
      notifyUnavailableGame();
      return;
    }
    setContractGame(g);
    setSelectedGame(null);
  };

  const handlePreviewGame = async (gameId: string) => {
    if (!isGameAvailable(gameId, user?.role)) {
      notifyUnavailableGame();
      return;
    }

    try {
      const res = await previewGame(gameId);

      const runnerUrl = new URL(res.juego.runner_url, window.location.origin);
      const returnTo = new URL("/catalog", window.location.origin);
      returnTo.searchParams.set("open_game", gameId);
      runnerUrl.searchParams.set("return_to", returnTo.toString());

      toast({
        title: "Modo prueba",
        description: "Abrimos el juego en preview con marca de agua.",
      });
      window.location.href = runnerUrl.toString();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el preview";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Catálogo de Juegos</h1>
          <p className="text-muted-foreground mt-1">
            Explora nuestra colección de juegos interactivos para tus eventos
          </p>
        </motion.div>

        {loading && <p className="text-sm text-muted-foreground mb-6">Cargando juegos...</p>}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground mb-6"
        >
          {filteredGames.length} juego{filteredGames.length !== 1 ? "s" : ""} encontrado
          {filteredGames.length !== 1 ? "s" : ""}
        </motion.p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game, idx) => {
            const isContracted = contractedGames.some((cg) => cg.id === game.id);

            return (
              <GameCard
                key={game.id}
                game={game}
                index={idx}
                onViewDetails={setSelectedGame}
                isContracted={isContracted}
                onContract={handleOpenContract}
                isAvailable={isGameAvailable(game.id, user?.role)}
                onUnavailableClick={notifyUnavailableGame}
              />
            );
          })}
        </div>

        <GameDetailModal
          game={selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
          onContract={(gameId) => handleOpenContract(gameId)}
          onPreview={handlePreviewGame}
          isContracted={
            selectedGame ? contractedGames.some((cg) => cg.id === selectedGame.id) : false
          }
        />

        <PurchaseFlowModal
          game={contractGame}
          open={!!contractGame}
          onClose={() => setContractGame(null)}
          onPurchased={() => {
            toast({ title: "Contrato creado", description: "Ya podes personalizar este juego." });
            void refreshContractedGames();
          }}
        />
      </main>
    </div>
  );
}
