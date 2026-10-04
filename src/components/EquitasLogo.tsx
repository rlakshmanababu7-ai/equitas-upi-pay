import React from "react";

export default function EquitasLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Official Equitas emblem SVG */}
      <svg
        viewBox="0 0 160 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
        aria-label="Equitas Small Finance Bank Logo"
      >
        {/* Stylized Equitas circular arc icon */}
        <g transform="translate(4, 2)">
          {/* Blue arc */}
          <path
            d="M 20 2 C 30 2 38 10 38 20 C 38 23 37 26 35 28 C 34 26 31 23 27 21 C 24 19 20 18 16 18 C 10 18 5 21 2 26 C 2 24 2 22 2 20 C 2 10 10 2 20 2 Z"
            fill="#003874"
          />
          {/* Orange curve */}
          <path
            d="M 20 38 C 10 38 2 30 2 20 C 2 17 3 14 5 12 C 6 14 9 17 13 19 C 16 21 20 22 24 22 C 30 22 35 19 38 14 C 38 16 38 18 38 20 C 38 30 30 38 20 38 Z"
            fill="#F37021"
          />
          {/* Inner accent dot */}
          <circle cx="20" cy="20" r="3.5" fill="#003874" />
        </g>

        {/* Equitas text */}
        <text
          x="48"
          y="26"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="22"
          fontWeight="800"
          fill="#003874"
          letterSpacing="-0.5px"
        >
          equitas
        </text>

        {/* Small Finance Bank subtitle */}
        <text
          x="48"
          y="37"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="7.5"
          fontWeight="600"
          fill="#F37021"
          letterSpacing="0.8px"
        >
          SMALL FINANCE BANK
        </text>
      </svg>
    </div>
  );
}
