import React from "react";

export function GooglePayLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Google Pay">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function PhonePeLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-label="PhonePe">
      <rect width="36" height="36" rx="8" fill="#5f259f" />
      {/* Official stylized Devanagari 'Pe' glyph */}
      <path
        fill="#ffffff"
        d="M20.5 8h-4.8c-1.8 0-3.3 1.2-3.7 2.9l-3 12.1h3.3l1.3-5.2h4.5c3.2 0 5.7-2.4 5.7-5.4 0-2.4-1.6-4.4-3.3-4.4zm-1.1 6.8h-4.4l1.1-4.2h3.3c1.2 0 2.2.8 2.2 2.1 0 1.2-1 2.1-2.2 2.1z"
      />
      <path
        fill="#ffffff"
        d="M25.5 13.8c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"
      />
    </svg>
  );
}

export function PaytmLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 24" className={className} aria-label="Paytm">
      <rect width="72" height="24" rx="4" fill="#f4f8fc" />
      <text
        x="6"
        y="17"
        fill="#002e6e"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="15"
        letterSpacing="-0.5px"
      >
        Pay
      </text>
      <text
        x="36"
        y="17"
        fill="#00baf2"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="15"
        letterSpacing="-0.5px"
      >
        tm
      </text>
    </svg>
  );
}

export function UpiGenericLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 24" className={className} aria-label="UPI">
      <path fill="#097939" d="M12 4 L4 12 L12 20 L16 20 L8 12 L16 4 Z" />
      <path fill="#ed5f26" d="M18 4 L10 12 L18 20 L22 20 L14 12 L22 4 Z" />
      <text
        x="24"
        y="16"
        fill="#ffffff"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="10"
      >
        UPI
      </text>
    </svg>
  );
}
