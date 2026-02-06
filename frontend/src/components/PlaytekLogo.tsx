import { motion } from 'framer-motion';

interface PlaytekLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function PlaytekLogo({ size = 'md', showText = true }: PlaytekLogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-primary/30 blur-xl rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <svg 
          width={icon} 
          height={icon} 
          viewBox="0 0 48 48" 
          fill="none" 
          className="relative z-10"
        >
          <path
            d="M24 4L8 14V34L24 44L40 34V14L24 4Z"
            fill="url(#gradient)"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          <path
            d="M16 20L24 14L32 20V28L24 34L16 28V20Z"
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
          />
          <circle cx="24" cy="24" r="4" fill="hsl(var(--primary))" />
          <defs>
            <linearGradient id="gradient" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(177 100% 50%)" />
              <stop offset="1" stopColor="hsl(200 100% 60%)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <span className={`font-display font-bold ${text} gradient-text`}>
          Playtek
        </span>
      )}
    </motion.div>
  );
}
