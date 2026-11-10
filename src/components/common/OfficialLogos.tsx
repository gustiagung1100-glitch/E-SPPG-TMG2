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
 */
export const SPPGLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = false }) => {
  const sizeClass = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
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

        {/* Shield Container */}
        <path
          d="M50 6 C76 6, 92 14, 92 36 C92 70, 68 90, 50 96 C32 90, 8 70, 8 36 C8 14, 24 6, 50 6 Z"
          fill="url(#sppgBlueGrad)"
        />
        <path
          d="M50 11 C72 11, 86 18, 86 37 C86 67, 65 84, 50 90 C35 84, 14 67, 14 37 C14 18, 28 11, 50 11 Z"
          fill="none"
          stroke="url(#sppgGoldGrad)"
          strokeWidth="2"
        />

        {/* Crescent and Star / Hafshawaty Islamic & Service Emblem */}
        <path
          d="M53 22 C44 23 37 31 38 41 C39 50 48 57 58 55 C50 56 42 51 41 43 C40 34 45 26 53 22 Z"
          fill="url(#sppgGoldGrad)"
        />
        <polygon
          points="58,28 60,33 65,33 61,36 63,41 58,38 53,41 55,36 51,33 56,33"
          fill="url(#sppgGoldGrad)"
        />

        {/* Center Nutrition Symbol: Nutri-Plate with Fork and Leaf */}
        <circle cx="50" cy="58" r="16" fill="#ffffff" />
        <circle cx="50" cy="58" r="14.5" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <path
          d="M44 50 L44 56 C44 58 45.5 59 47 59 L47 67 C47 68 48 68.5 48.5 68.5 C49 68.5 50 68 50 67 L50 59 C51.5 59 53 58 53 56 L53 50 M46 50 L46 55 M48.5 50 L48.5 55 M51 50 L51 55"
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M53 52 C53 48 56 46 59 46 C59 50 56 53 53 52 Z"
          fill="#10b981"
        />

        {/* Ribbon at bottom */}
        <path d="M22 75 L78 75 L73 84 L27 84 Z" fill="url(#sppgGoldGrad)" />
        <text
          x="50"
          y="81.5"
          fontSize="5.5"
          fontWeight="900"
          fill="#0f2b5c"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.4"
        >
          HAFSHAWATY
        </text>
        <text
          x="50"
          y="89"
          fontSize="4.2"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          SPPG TMG2
        </text>
      </svg>

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
