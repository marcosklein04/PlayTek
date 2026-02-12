import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Check, Zap, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Game } from '@/types';

interface GameDetailModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onContract: (gameId: string) => void;
  onPreview?: (gameId: string) => void;
  isContracted?: boolean;
}

export function GameDetailModal({ game, isOpen, onClose, onContract, onPreview, isContracted }: GameDetailModalProps) {
  if (!game) return null;

  const creditsCost =
    typeof game.creditsCost === "number" && Number.isFinite(game.creditsCost)
      ? game.creditsCost
      : Number.isFinite(game.pricing.price)
        ? game.pricing.price
        : null;
  const miniBio = game.miniBio || game.shortDescription || game.description || "Sin descripción disponible.";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl max-h-[90vh] glass-card overflow-hidden flex flex-col"
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="flex flex-col md:flex-row h-full overflow-auto">
              {/* Image section */}
              <div className="relative md:w-1/2 min-h-[260px] md:min-h-[560px] bg-card/20">
                <img
                  src={game.image}
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-card to-transparent" />
                
                {/* Play button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40"
                >
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </motion.button>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {game.isPopular && (
                    <Badge className="bg-primary/90 text-primary-foreground border-0">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {game.isNew && (
                    <Badge className="bg-purple-accent/90 text-foreground border-0">
                      <Zap className="w-3 h-3 mr-1" />
                      Nuevo
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content section */}
              <div className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {game.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {game.shortDescription}
                    </p>
                  </div>

                  {/* Mini bio */}
                  <div className="glass-card p-4 rounded-xl">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Mini biografía
                    </h3>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {miniBio}
                    </p>
                  </div>

                  {/* Modality */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Modalidades
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {game.modality.length > 0 ? (
                        game.modality.map((mod) => (
                          <span
                            key={mod}
                            className="text-sm px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground"
                          >
                            {mod.replace('-', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Modalidad configurable según tipo de evento.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Características
                    </h3>
                    {game.features.length > 0 ? (
                      <ul className="space-y-2">
                        {game.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-foreground">
                            <Check className="w-4 h-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Este juego permite configuración de branding, textos y assets antes del evento.
                      </p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Precio por contratación
                        </span>
                        <p className="text-2xl font-bold gradient-text">
                          {creditsCost !== null ? `${creditsCost} créditos` : "Consultar"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Se descuenta de tu wallet al contratar.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isContracted ? "secondary" : "hero"}
                      size="lg"
                      className="w-full"
                      onClick={() => onContract(game.id)}
                      disabled={isContracted}
                    >
                      {isContracted ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Ya contratado
                        </>
                      ) : (
                        <>
                          Contratar ahora
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full mt-2"
                      onClick={() => onPreview && onPreview(game.id)}
                      disabled={!onPreview}
                    >
                      Probar con marca de agua
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
