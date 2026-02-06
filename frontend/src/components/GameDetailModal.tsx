import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Check, Users, Zap, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Game } from '@/types';

interface GameDetailModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onContract: (gameId: string) => void;
  isContracted?: boolean;
}

export function GameDetailModal({ game, isOpen, onClose, onContract, isContracted }: GameDetailModalProps) {
  if (!game) return null;

  const formatPrice = (pricing: Game['pricing']) => {
    const periodMap = {
      month: '/mes',
      year: '/año',
      event: '/evento',
    };
    const typeMap = {
      subscription: 'Suscripción',
      'per-event': 'Por evento',
      'one-time': 'Único pago',
    };
    return {
      price: `$${pricing.price} USD${pricing.period ? periodMap[pricing.period] : ''}`,
      type: typeMap[pricing.type],
    };
  };

  const priceInfo = formatPrice(game.pricing);

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] glass-card overflow-hidden z-50 flex flex-col"
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
              <div className="relative md:w-1/2 aspect-video md:aspect-auto">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover"
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
                      {game.description}
                    </p>
                  </div>

                  {/* Modality */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Modalidades
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {game.modality.map((mod) => (
                        <span
                          key={mod}
                          className="text-sm px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground"
                        >
                          {mod.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Características
                    </h3>
                    <ul className="space-y-2">
                      {game.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-foreground">
                          <Check className="w-4 h-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing */}
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {priceInfo.type}
                        </span>
                        <p className="text-2xl font-bold gradient-text">
                          {priceInfo.price}
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
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
