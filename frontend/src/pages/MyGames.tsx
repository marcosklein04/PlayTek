import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, ExternalLink, Calendar, Gamepad2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function MyGames() {
  const { contractedGames } = useAuth();
  const navigate = useNavigate();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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
            Gestiona y opera tus juegos contratados
          </p>
        </motion.div>

        {/* Games list */}
        {contractedGames.length > 0 ? (
          <div className="space-y-4">
            {contractedGames.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
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
                      {game.status === 'active' ? 'Activo' : game.status}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-display font-semibold text-xl text-foreground">
                        {game.name}
                      </h3>
                      <span className="text-primary font-bold whitespace-nowrap">
                        ${game.pricing.price} USD/{game.pricing.period}
                      </span>
                    </div>

                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {game.shortDescription}
                    </p>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Contratado el {formatDate(game.contractedAt)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gamepad2 className="w-4 h-4" />
                        {game.category}
                      </div>
                    </div>

                    {/* Modalities */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {game.modality.map((mod) => (
                        <span
                          key={mod}
                          className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                        >
                          {mod.replace('-', ' ')}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="glow" size="sm">
                        <Play className="w-4 h-4 mr-1" />
                        Operar juego
                      </Button>
                      <Button variant="glass" size="sm">
                        <Settings className="w-4 h-4 mr-1" />
                        Configurar
                      </Button>
                      <Button variant="ghost" size="sm">
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
              Explora nuestro catálogo y contrata tu primer juego para empezar a crear experiencias increíbles.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate('/catalog')}>
              Explorar catálogo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
