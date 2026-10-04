import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex FinServe | Secure UPI EMI Payment Gateway",
  description:
    "Generate short-lived, encrypted EMI payment links and collect direct bank settlements via UPI.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b1b2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-navy-100 selection:text-navy-900">
        {children}
      </body>
    </html>
  );
}
