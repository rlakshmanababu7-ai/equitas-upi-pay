import React from "react";

export function GooglePayLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png"
      alt="Google Pay"
      className={`${className} object-contain`}
      loading="eager"
    />
  );
}

export function PhonePeLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png"
      alt="PhonePe"
      className={`${className} object-contain`}
      loading="eager"
    />
  );
}

export function PaytmLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://images.seeklogo.com/logo-png/50/1/paytm-logo-png_seeklogo-501241.png"
      alt="Paytm"
      className={`${className} object-contain max-h-7`}
      loading="eager"
    />
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
