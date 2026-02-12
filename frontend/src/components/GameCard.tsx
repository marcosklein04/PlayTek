import { motion } from 'framer-motion';
import { Play, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Game } from '@/types';

interface GameCardProps {
  game: Game;
  onContract?: (gameId: string) => void; 
  onViewDetails: (game: Game) => void;
  isContracted?: boolean;
  index?: number;
}

export function GameCard({ game, onContract, onViewDetails, isContracted, index = 0 }: GameCardProps) {
  const formatPrice = (pricing: Game['pricing']) => {
    if (typeof game.creditsCost === "number" && Number.isFinite(game.creditsCost) && game.creditsCost > 0) {
      return `${game.creditsCost} créditos`;
    }
    const periodMap = {
      month: '/mes',
      year: '/año',
      event: '/evento',
    };
    return `$${pricing.price} ${pricing.period ? periodMap[pricing.period] : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-card-hover group overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {game.isPopular && (
            <Badge className="bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1" />
              Popular
            </Badge>
          )}
          {game.isNew && (
            <Badge className="bg-purple-accent/90 text-foreground border-0 backdrop-blur-sm">
              <Zap className="w-3 h-3 mr-1" />
              Nuevo
            </Badge>
          )}
        </div>

        {/* Play button overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          whileHover={{ scale: 1.05 }}
        >
          <Button 
            variant="glow" 
            size="lg" 
            className="rounded-full"
            onClick={() => onViewDetails(game)}
          >
            <Play className="w-5 h-5" />
            Ver detalles
          </Button>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-display font-semibold text-lg text-foreground line-clamp-1">
            {game.name}
          </h3>
          <span className="text-primary font-bold text-sm whitespace-nowrap ml-2">
            {formatPrice(game.pricing)}
          </span>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {game.shortDescription}
        </p>

        {/* Modality tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {game.modality.slice(0, 3).map((mod) => (
            <span
              key={mod}
              className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
            >
              {mod.replace('-', ' ')}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="glass" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails(game)}
          >
            Detalles
          </Button>
          <Button
            variant={isContracted ? "secondary" : "glow"}
            size="sm"
            className="flex-1"
            onClick={() => onContract && onContract(game.id)}
            disabled={!onContract}
          >
            Contratar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
