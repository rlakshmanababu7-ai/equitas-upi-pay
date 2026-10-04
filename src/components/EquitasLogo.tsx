import React from "react";

export default function EquitasLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://equitas.bank.in/strapi-dev/uploads/Group_2_cad9c29024.svg"
        alt="Equitas Small Finance Bank"
        className="h-full w-auto max-h-12 object-contain"
        loading="eager"
      />
    </div>
  );
}
