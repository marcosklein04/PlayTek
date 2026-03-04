import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, TrendingUp, Calendar, ArrowRight, Sparkles, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';
import { GameCard } from '@/components/GameCard';
import { GameDetailModal } from '@/components/GameDetailModal';
import { PurchaseFlowModal } from '@/components/PurchaseFlowModal';
import { useAuth } from '@/context/AuthContext';
import { fetchGames, previewGame } from '@/api/games';
import { mapApiGameToGame } from '@/mappers/gameMapper';
import { Game } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isGameAvailable } from '@/lib/gameAvailability';

export default function Dashboard() {
  const { user, contractedGames, refreshContractedGames } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameToContract, setGameToContract] = useState<Game | null>(null);

  const notifyUnavailableGame = useCallback(() => {
    toast({
      title: 'Próximamente',
      description: 'este juego no esta disponible',
      variant: 'destructive',
    });
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingGames(true);
        const { resultados } = await fetchGames();
        setGames(resultados.map(mapApiGameToGame));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cargar juegos';
        toast({ title: 'Error cargando juegos', description: message, variant: 'destructive' });
      } finally {
        setLoadingGames(false);
      }
    })();
  }, [toast]);

  const stats = [
    { label: 'Juegos contratados', value: contractedGames.length, icon: Gamepad2, color: 'text-primary' },
    { label: 'Eventos este mes', value: 12, icon: Calendar, color: 'text-purple-accent' },
    { label: 'Jugadores totales', value: '2.4K', icon: TrendingUp, color: 'text-success' },
  ];

  const popularGames = useMemo(() => {
    const byPreferredSlug = ['trivia', 'trivia-sparkle']
      .map((slug) => games.find((game) => game.id === slug))
      .filter((game): game is Game => Boolean(game));

    const additionalTrivia = games.filter(
      (game) => game.category === 'trivia' && !byPreferredSlug.some((preferred) => preferred.id === game.id),
    );

    return [...byPreferredSlug, ...additionalTrivia].slice(0, 2);
  }, [games]);

  const handleOpenContract = (gameId: string) => {
    const game = games.find((item) => item.id === gameId) || null;
    if (game && !isGameAvailable(game.id)) {
      notifyUnavailableGame();
      return;
    }
    setGameToContract(game);
    setSelectedGame(null);
  };

  const handlePreviewGame = async (gameId: string) => {
    if (!isGameAvailable(gameId)) {
      notifyUnavailableGame();
      return;
    }

    try {
      const res = await previewGame(gameId);
      const runnerUrl = new URL(res.juego.runner_url, window.location.origin);
      const returnTo = new URL('/dashboard', window.location.origin);
      runnerUrl.searchParams.set('return_to', returnTo.toString());

      toast({
        title: 'Modo prueba',
        description: 'Abrimos el juego en preview con marca de agua.',
      });
      window.location.href = runnerUrl.toString();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el preview';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
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
            ¡Hola, {user?.name}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido de vuelta a Playtek. Tu centro de control de juegos interactivos.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-accent/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-foreground">
                  Explora nuestro catálogo
                </h2>
                <p className="text-muted-foreground text-sm">
                  Descubre los mejores juegos para tus próximos eventos
                </p>
              </div>
            </div>
            <Button variant="hero" size="lg" onClick={() => navigate('/catalog')}>
              Explorar juegos
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* My games preview */}
        {contractedGames.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Mis juegos
              </h2>
              <Button variant="ghost" onClick={() => navigate('/my-games')}>
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contractedGames.slice(0, 3).map((game, idx) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{game.name}</h3>
                      <p className="text-sm text-muted-foreground">Activo</p>
                    </div>
                    <Button variant="glow" size="icon">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Popular games */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Juegos populares
            </h2>
            <Button variant="ghost" onClick={() => navigate('/catalog')}>
              Ver catálogo
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {popularGames.map((game, idx) => (
              <GameCard
                key={game.id}
                game={game}
                index={idx}
                onContract={handleOpenContract}
                onViewDetails={setSelectedGame}
                isContracted={contractedGames.some(cg => cg.id === game.id)}
                isAvailable={isGameAvailable(game.id)}
                onUnavailableClick={notifyUnavailableGame}
              />
            ))}
          </div>
          {loadingGames && (
            <p className="text-sm text-muted-foreground mt-4">
              Cargando juegos populares...
            </p>
          )}
          {!loadingGames && popularGames.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              No se encontraron trivias para mostrar.
            </p>
          )}
        </motion.section>

        <GameDetailModal
          game={selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
          onContract={handleOpenContract}
          onPreview={handlePreviewGame}
          isContracted={selectedGame ? contractedGames.some((cg) => cg.id === selectedGame.id) : false}
        />

        <PurchaseFlowModal
          game={gameToContract}
          open={!!gameToContract}
          onClose={() => setGameToContract(null)}
          onPurchased={() => {
            toast({ title: 'Contrato creado', description: 'Ya podes personalizar este juego.' });
            void refreshContractedGames();
          }}
        />
      </main>
    </div>
  );
}
