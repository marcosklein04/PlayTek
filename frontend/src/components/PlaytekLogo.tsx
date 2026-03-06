import { motion } from 'framer-motion';

interface PlaytekLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const LOGO_SRC = '/img/playtek-logo-white.png';

export function PlaytekLogo({ size = 'md', showText = true }: PlaytekLogoProps) {
  const sizes = {
    sm: {
      fullWidth: 'w-28',
      compactFrame: 'w-8 h-8',
      compactImage: 'w-24 max-w-none',
    },
    md: {
      fullWidth: 'w-36',
      compactFrame: 'w-10 h-10',
      compactImage: 'w-28 max-w-none',
    },
    lg: {
      fullWidth: 'w-52',
      compactFrame: 'w-14 h-14',
      compactImage: 'w-40 max-w-none',
    },
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      className="flex items-center"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showText ? (
        <img
          src={LOGO_SRC}
          alt="Playtek"
          className={`${currentSize.fullWidth} h-auto object-contain`}
          draggable={false}
        />
      ) : (
        <div className={`${currentSize.compactFrame} overflow-hidden rounded-md`}>
          <img
            src={LOGO_SRC}
            alt="Playtek"
            className={`${currentSize.compactImage} h-auto object-contain object-left`}
            draggable={false}
          />
        </div>
      )}
    </motion.div>
  );
}
