import { motion } from 'framer-motion';

interface PlaytekLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const LOGO_SRC = '/img/playtek-logo-white.png';

export function PlaytekLogo({ size = 'md', showText = true }: PlaytekLogoProps) {
  const sizes = {
    sm: {
      fullFrame: 'w-36 h-12',
      compactFrame: 'w-10 h-10',
      compactImage: 'w-28 max-w-none',
    },
    md: {
      fullFrame: 'w-48 h-16',
      compactFrame: 'w-12 h-12',
      compactImage: 'w-32 max-w-none',
    },
    lg: {
      fullFrame: 'w-72 h-24',
      compactFrame: 'w-14 h-14',
      compactImage: 'w-40 max-w-none',
    },
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      className="flex w-full items-center justify-center"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showText ? (
        <div className={`${currentSize.fullFrame} overflow-hidden`}>
          <img
            src={LOGO_SRC}
            alt="Playtek"
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>
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
