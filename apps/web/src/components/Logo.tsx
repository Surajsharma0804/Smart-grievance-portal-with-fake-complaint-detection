import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
}

/**
 * Nagrik Setu Official Vector Emblem ("Setu Crown")
 * Features:
 * - Parabolic suspension arch bridge (Setu) spanning citizen and administration
 * - Radiant amber beacon of vigilance & anti-fraud detection at the apex
 * - Vertical suspension cables (golden ratio milestones)
 * - Calming civic resolution waterlines beneath
 */
export function NagrikSetuIcon({
  size = 'md',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative shrink-0 rounded-xl overflow-hidden shadow-xs ${dimension} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Civic Deep Teal Ground */}
        <rect width="100" height="100" rx="22" fill="#0f766e" />
        
        {/* Subtle Precision Inner Bezel */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="20"
          stroke="white"
          strokeOpacity="0.16"
          strokeWidth="2"
        />

        {/* Golden Beacon of Vigilance & Citizen Truth (Anti-fraud) */}
        <circle cx="50" cy="22" r="5" fill="#f59e0b" />
        <path
          d="M50 12 L52.2 18 L58 22 L52.2 26 L50 32 L47.8 26 L42 22 L47.8 18 Z"
          fill="#f59e0b"
        />
        <circle cx="50" cy="22" r="2" fill="#ffffff" />

        {/* Main Suspension Arch (Setu) */}
        <path
          d="M16 68 C24 40, 36 33, 50 33 C64 33, 76 40, 84 68"
          stroke="white"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Civic Roadway Deck */}
        <path
          d="M14 54 L86 54"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Golden Suspension Stays / Milestone Connectors */}
        <path d="M32 44 L32 54" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M44 35 L44 54" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M56 35 L56 54" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M68 44 L68 54" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />

        {/* Foundation Pillars */}
        <path d="M17 54 L17 72" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path d="M83 54 L83 72" stroke="white" strokeWidth="5" strokeLinecap="round" />

        {/* Stream of Redressal / Water Lines */}
        <path
          d="M28 76 Q39 73 50 76 T72 76"
          stroke="white"
          strokeOpacity="0.65"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M35 82 Q43 80 50 82 T65 82"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Complete Nagrik Setu Brand Lockup with Typography
 */
export function NagrikSetuLogo({
  size = 'md',
  showSubtitle = true,
  className = '',
  variant = 'auto',
}: LogoProps) {
  const textColor =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
      ? 'text-gray-900'
      : 'text-gray-900 dark:text-white';

  const subtextColor =
    variant === 'light'
      ? 'text-gray-400'
      : 'text-gray-500';

  const textSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  const subtextSize = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <NagrikSetuIcon size={size} />
      <div className="flex flex-col">
        <span className={`font-bold tracking-tight leading-none ${textSize} ${textColor}`}>
          Nagrik Setu
        </span>
        {showSubtitle && (
          <span className={`font-medium tracking-wide mt-1 leading-none ${subtextSize} ${subtextColor}`}>
            नागरिक सेतु | Smart Grievance Portal
          </span>
        )}
      </div>
    </div>
  );
}

export default NagrikSetuLogo;
