import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

/**
 * Official Logo Badan Gizi Nasional (BGN) Republik Indonesia
 */
export const BGNLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = false }) => {
  const [imageError, setImageError] = React.useState(false);
  const sizeClass = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {!imageError ? (
        <img
          src="/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"
          alt="Logo Badan Gizi Nasional (BGN)"
          className={`${sizeClass} object-contain shrink-0 drop-shadow-xs`}
          onError={() => setImageError(true)}
        />
      ) : (
        /* Crisp Vector Fallback if image asset fails to load */
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} shrink-0 drop-shadow-xs`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bgnGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="bgnGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#b45309" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#047857" strokeWidth="1.5" />
          {/* Padi & Kapas Ring */}
          <path
            d="M26 62 C20 48 24 32 36 24 C38 34 34 48 42 56"
            fill="none"
            stroke="url(#bgnGold)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M74 62 C80 48 76 32 64 24 C62 34 66 48 58 56"
            fill="none"
            stroke="url(#bgnGreen)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Center Plate / Shield */}
          <circle cx="50" cy="50" r="18" fill="#1e3a8a" />
          <path
            d="M44 42 L44 48 C44 50 46 52 48 52 L48 58 M52 58 L52 52 C54 52 56 50 56 48 L56 42"
            stroke="#ffffff"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="50" cy="38" r="3" fill="#f59e0b" />
          <path d="M40 70 L60 70 L58 76 L42 76 Z" fill="#b45309" />
          <text
            x="50"
            y="74.5"
            fontSize="4.5"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            BGN RI
          </text>
        </svg>
      )}

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-blue-950 dark:text-white">
            Badan Gizi Nasional
          </span>
          <span className="text-[8px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400">
            Republik Indonesia
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Official Logo SPPG Yayasan Hafshawaty
 * SPPG Probolinggo Krejengan Temenggungan 2 (ID: GFBQSYXD)
 * Diperbarui menggunakan emblem resmi Badan Gizi Nasional (BGN) RI
 */
export const SPPGLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = false }) => {
  const [imageError, setImageError] = React.useState(false);
  const sizeClass = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {!imageError ? (
        <img
          src="/logo-sppg.png"
          alt="Logo SPPG Temenggungan 2 - Badan Gizi Nasional"
          className={`${sizeClass} object-contain shrink-0 drop-shadow-xs rounded-full hover:scale-105 transition-transform duration-200`}
          onError={() => setImageError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} shrink-0 drop-shadow-xs`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sppgBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f2b5c" />
              <stop offset="60%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="sppgGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Circular Badge Container */}
          <circle cx="50" cy="50" r="48" fill="url(#sppgBlueGrad)" stroke="url(#sppgGoldGrad)" strokeWidth="3" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,2" />

          {/* Nutrition Emblem: Garudapada & Nutri-Plate */}
          <circle cx="50" cy="50" r="22" fill="#ffffff" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#10b981" strokeWidth="1.8" />
          <path
            d="M44 42 L44 48 C44 50 46 52 48 52 L48 58 M52 58 L52 52 C54 52 56 50 56 48 L56 42"
            stroke="#1e3a8a"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="50" cy="38" r="3" fill="#f59e0b" />
          <text
            x="50"
            y="76"
            fontSize="5.5"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            SPPG TMG2
          </text>
        </svg>
      )}

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-blue-950 dark:text-white">
            SPPG Probolinggo Krejengan
          </span>
          <span className="text-[8px] sm:text-[10px] font-semibold text-sky-700 dark:text-sky-300">
            Yayasan Hafshawaty • TMG 2
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Dual Logo Header for Official Documents and Print
 */
export const OfficialDualLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <SPPGLogo size={size} showText />
      <BGNLogo size={size} showText />
    </div>
  );
};
