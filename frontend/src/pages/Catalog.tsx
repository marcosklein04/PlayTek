import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/Sidebar";
import { GameCard } from "@/components/GameCard";
import { GameDetailModal } from "@/components/GameDetailModal";
import { useAuth } from "@/context/AuthContext";
import { categories } from "@/data/games";
import { fetchGames } from "@/api/games";
import { Game } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { mapApiGameToGame } from "@/mappers/gameMapper";
import { PurchaseFlowModal } from "@/components/PurchaseFlowModal";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [contractGame, setContractGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { contractedGames } = useAuth();
  const { toast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        game.name.toLowerCase().includes(search.toLowerCase()) ||
        game.shortDescription.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || game.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [games, search, selectedCategory]);

  const handleOpenContract = (gameId: string) => {
    const g = games.find((x) => x.id === gameId) || null;
    setContractGame(g);
    setSelectedGame(null);
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar juegos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "glow" : "glass"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-1 ml-auto">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
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

        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
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
              />
            );
          })}
        </div>

        <GameDetailModal
          game={selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
          onContract={(gameId) => handleOpenContract(gameId)}
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
          }}
        />
      </main>
    </div>
  );
}
