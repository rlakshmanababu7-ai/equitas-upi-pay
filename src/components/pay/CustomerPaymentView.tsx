"use client";

import { useState, useEffect } from "react";
import EquitasLogo from "@/components/EquitasLogo";
import { Copy, Check, Smartphone, QrCode, AlertCircle, X } from "lucide-react";
import { formatINR, generateEquitasUpiLinks, buildEquitasUpiQuery } from "@/lib/upi";
import { decodePaymentPayload, DecodedPaymentData } from "@/lib/payload";
import { GooglePayLogo, PhonePeLogo, PaytmLogo, UpiGenericLogo } from "./BrandLogos";
import QRCode from "qrcode";

export default function CustomerPaymentView({ token }: { token: string }) {
  // Synchronous initial decode to eliminate any flash of error screen
  const [data, setData] = useState<DecodedPaymentData | null>(() => {
    if (!token) return null;
    return decodePaymentPayload(token);
  });
  const [loading, setLoading] = useState<boolean>(() => !data);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Payment link is missing.");
      setLoading(false);
      return;
    }

    const decoded = decodePaymentPayload(token);
    if (!decoded) {
      setError("This payment link is invalid or corrupted.");
      setLoading(false);
      return;
    }

    setData(decoded);
    setLoading(false);

    // Pre-generate QR code
    const query = `upi://pay?${buildEquitasUpiQuery({
      loanAccountNumber: decoded.loanAccountNumber,
      upiId: decoded.upiId,
      customerName: decoded.customerName,
      amount: decoded.amount,
    })}`;

    QRCode.toDataURL(query, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#003874", // Equitas Blue
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [token]);

  // Robust mobile-safe clipboard copy with fallback
  const handleCopyUpiId = async () => {
    if (!data?.upiId) return;
    const textToCopy = data.upiId;
    let copiedSuccess = false;

    // 1. Modern async Clipboard API
    if (navigator?.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copiedSuccess = true;
      } catch (err) {
        console.warn("Async clipboard failed, using fallback:", err);
      }
    }

    // 2. Reliable fallback for mobile webviews (document.execCommand)
    if (!copiedSuccess && typeof document !== "undefined") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.padding = "0";
        textArea.style.border = "none";
        textArea.style.outline = "none";
        textArea.style.boxShadow = "none";
        textArea.style.background = "transparent";
        textArea.style.opacity = "0";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        copiedSuccess = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
    }

    if (copiedSuccess) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Initial Skeleton Loading Screen (Guarantees NO flash of error screen)
  if (loading) {
    return (
      <div className="h-screen w-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col justify-between p-3 sm:p-4">
        <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center space-y-3">
          {/* Logo container */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs flex items-center justify-center">
            <EquitasLogo className="h-8" />
          </div>

          {/* Details Skeleton Card */}
          <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-xs space-y-2.5 animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-7 bg-slate-200 rounded w-1/2 mx-auto"></div>
            <div className="border-t border-slate-100 pt-2 space-y-2.5">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-10 bg-blue-50/70 border border-blue-100 rounded w-full mt-2"></div>
          </div>

          {/* Buttons Skeleton */}
          <div className="grid grid-cols-2 gap-2 animate-pulse">
            <div className="h-12 bg-slate-200 rounded-lg"></div>
            <div className="h-12 bg-slate-200 rounded-lg"></div>
            <div className="h-12 bg-slate-200 rounded-lg"></div>
            <div className="h-12 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-9 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>

        <footer className="text-center text-[10px] text-slate-400 py-1 shrink-0">
          Equitas Small Finance Bank
        </footer>
      </div>
    );
  }

  // 2. Error Screen (Only shown when decoding is truly failed)
  if (error || !data) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-xs w-full border border-slate-200 shadow-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Invalid Payment Link</h2>
          <p className="text-xs text-slate-500">{error || "Could not load loan details."}</p>
        </div>
      </div>
    );
  }

  // 3. Expired Screen (1 day TTL)
  if (data.expired) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-xs w-full border border-slate-200 shadow-sm text-center space-y-3">
          <EquitasLogo className="h-8 justify-center" />
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Payment Link Expired</h2>
          <p className="text-xs text-slate-500">
            This loan payment link has expired (1 day validity). Please contact Equitas for a new link.
          </p>
        </div>
      </div>
    );
  }

  const upiLinks = generateEquitasUpiLinks({
    loanAccountNumber: data.loanAccountNumber,
    upiId: data.upiId,
    customerName: data.customerName,
    amount: data.amount,
  });

  // 4. Main Non-Scrollable Customer Screen with Large, Clear Typography
  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col justify-between p-3 sm:p-4">
      {/* Centered Main Box with compact padding and no scrolling */}
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center space-y-2.5">
        {/* Official Equitas Logo */}
        <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-slate-200 shadow-xs flex items-center justify-center">
          <EquitasLogo className="h-8 sm:h-9" />
        </div>

        {/* Customer & Loan Details Card with Larger Font Sizes for Elderly & High Visibility */}
        <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200 shadow-xs space-y-2">
          {data.amount && data.amount > 0 ? (
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Amount Due
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#003874] tracking-tight mt-0.5">
                {formatINR(data.amount)}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {/* Customer Name (Larger & Clearer) */}
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Customer Name</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 text-right truncate pl-2">
                {data.customerName}
              </span>
            </div>

            {/* Loan Account Number (Larger, Monospaced & Clearer) */}
            <div className="flex justify-between items-baseline py-0.5 border-t border-slate-100 pt-1.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Loan Account</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-slate-900 tracking-wider text-right">
                {data.loanAccountNumber}
              </span>
            </div>

            {/* Loan UPI ID with copy button (Larger, high contrast) */}
            <div className="border-t border-slate-100 pt-1.5">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                Loan UPI ID
              </span>
              <div className="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded bg-blue-50/80 border border-blue-100">
                <code className="font-mono text-xs sm:text-sm font-bold text-[#003874] select-all truncate">
                  {data.upiId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0 shadow-xs"
                  aria-label="Copy UPI ID"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* UPI App Buttons Section with Official Larger Logos */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block px-0.5">
            Pay via UPI App
          </span>

          <div className="grid grid-cols-2 gap-2">
            {/* Google Pay */}
            <a
              href={upiLinks.googlePay}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-transform active:scale-95"
            >
              <GooglePayLogo className="w-7 h-7 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Google Pay</span>
            </a>

            {/* PhonePe */}
            <a
              href={upiLinks.phonePe}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white border border-purple-200 hover:bg-purple-50/50 shadow-xs transition-transform active:scale-95"
            >
              <PhonePeLogo className="w-7 h-7 shrink-0" />
              <span className="text-xs font-bold text-purple-900">PhonePe</span>
            </a>

            {/* Paytm */}
            <a
              href={upiLinks.paytm}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white border border-sky-200 hover:bg-sky-50/50 shadow-xs transition-transform active:scale-95"
            >
              <PaytmLogo className="h-6 w-auto shrink-0" />
              <span className="text-xs font-bold text-[#002e6e]">Paytm</span>
            </a>

            {/* Any UPI App */}
            <a
              href={upiLinks.universal}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#003874] hover:bg-[#002855] text-white shadow-xs transition-transform active:scale-95"
            >
              <UpiGenericLogo className="h-4 w-auto shrink-0" />
              <span className="text-xs font-bold">Any UPI App</span>
            </a>
          </div>
        </div>

        {/* Get QR Code Button (prevents page from scrolling) */}
        <div>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <QrCode className="w-4 h-4 text-[#003874]" />
            <span>Get QR Code</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-400 py-1 shrink-0">
        Equitas Small Finance Bank
      </footer>

      {/* QR Code Popup Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg p-4 max-w-xs w-full text-center space-y-3 relative shadow-xl">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pt-1">
              <span className="text-xs font-bold text-[#003874] block">Scan to Pay</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{data.loanAccountNumber}</span>
            </div>

            {qrCodeDataUrl ? (
              <div className="inline-block p-2 bg-white border border-slate-200 rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="Equitas UPI QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400 mx-auto">
                Generating QR...
              </div>
            )}

            <div className="text-[10px] text-slate-400">
              Scan with GPay, PhonePe, Paytm, BHIM, or any UPI app
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
