import React from 'react';

/**
 * Official TOZON Brand Logo Component
 * Combines TOZON Coral Red (#FF1738), TOZON Blue (#3154F5), Pure White and Dark Slate accents.
 */
export const TozonLogo = ({
  size = 'md',
  showTagline = true,
  collapsed = false,
  tagline = 'REAL ESTATE',
  className = ''
}) => {
  // Size presets
  const sizeConfig = {
    sm: {
      iconSize: 'h-8 w-8',
      titleSize: 'text-sm font-black',
      taglineSize: 'text-[9px] font-bold tracking-widest',
      gap: 'gap-2'
    },
    md: {
      iconSize: 'h-10 w-10',
      titleSize: 'text-base font-black',
      taglineSize: 'text-[10px] font-extrabold tracking-widest',
      gap: 'gap-2.5'
    },
    lg: {
      iconSize: 'h-12 w-12',
      titleSize: 'text-xl font-black',
      taglineSize: 'text-[11px] font-extrabold tracking-widest',
      gap: 'gap-3'
    }
  }[size] || sizeConfig.md;

  return (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Official TOZON Geometric Brand Mark */}
      <div className={`relative ${sizeConfig.iconSize} shrink-0 rounded-xl overflow-hidden shadow-xs`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background Card */}
          <rect width="100" height="100" rx="20" fill="#FFFFFF" />
          <rect width="100" height="100" rx="20" fill="url(#tozon-grad-bg)" opacity="0.08" />

          {/* Left / Upper Red Architecture Wing */}
          <path
            d="M20 28C20 23.5817 23.5817 20 28 20H48V52H28C23.5817 52 20 48.4183 20 44V28Z"
            fill="#FF1738"
          />
          
          {/* Top-Right Red Accent Block */}
          <path
            d="M52 20H72C76.4183 20 80 23.5817 80 28V36H52V20Z"
            fill="#E10E2D"
          />

          {/* Center-Right Dynamic TOZON Blue Building Block */}
          <path
            d="M52 40H80V72C80 76.4183 76.4183 80 72 80H52V40Z"
            fill="#3154F5"
          />

          {/* Lower-Left TOZON Blue Foundation */}
          <path
            d="M28 56H48V80H28C23.5817 80 20 76.4183 20 72V64C20 59.5817 23.5817 56 28 56Z"
            fill="#2540D9"
          />

          {/* Crisp White Geometric Cutout / Intersect */}
          <circle cx="50" cy="46" r="6" fill="#FFFFFF" />
          <path d="M48 20H52V80H48V20Z" fill="#FFFFFF" />
          <path d="M20 52H80V56H20V52Z" fill="#FFFFFF" />

          {/* Subtle Dark Bottom Anchor Line */}
          <rect x="28" y="76" width="44" height="4" rx="2" fill="#111827" opacity="0.15" />

          <defs>
            <linearGradient id="tozon-grad-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3154F5" />
              <stop offset="1" stopColor="#FF1738" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* TOZON Wordmark & Real Estate Label */}
      {!collapsed && (
        <div className="flex flex-col leading-tight select-none">
          <div className="flex items-center gap-1">
            <span className={`${sizeConfig.titleSize} text-slate-900 tracking-tight`}>
              TOZON
            </span>
            <span className={`${sizeConfig.titleSize} text-tozon-blue font-black`}>
              CRM
            </span>
          </div>
          {showTagline && (
            <span className={`${sizeConfig.taglineSize} text-tozon-red font-black uppercase`}>
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
export default TozonLogo;
