"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import EquitasLogo from "@/components/EquitasLogo";
import { Copy, Check, Smartphone, QrCode, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/upi";

interface UpiLinks {
  universal: string;
  googlePay: string;
  phonePe: string;
  paytm: string;
}

interface PaymentData {
  expired: boolean;
  customerName: string;
  loanAccountNumber: string;
  upiId: string;
  amount?: number | null;
  upiLinks?: UpiLinks;
  qrCodeDataUrl?: string;
  message?: string;
}

export default function CustomerPaymentView({ token }: { token: string }) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/pay/${encodeURIComponent(token)}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Failed to load payment details.");
        }

        setData(result);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load payment details.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadData();
    }
  }, [token]);

  const handleCopyUpiId = () => {
    if (!data?.upiId) return;
    navigator.clipboard.writeText(data.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-slate-200 shadow-sm text-center space-y-4">
          <EquitasLogo className="h-9 justify-center" />
          <p className="text-xs text-slate-500 animate-pulse">Loading loan payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Payment Link Unavailable</h2>
          <p className="text-xs text-slate-500">{error || "This payment link could not be found."}</p>
        </div>
      </div>
    );
  }

  if (data.expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-slate-200 shadow-sm text-center space-y-4">
          <EquitasLogo className="h-9 justify-center" />
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Payment Link Expired</h2>
          <p className="text-xs text-slate-500">
            {data.message || "This loan payment link has expired. Please contact Equitas for a new link."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4">
      <div className="max-w-md mx-auto w-full space-y-5">
        {/* Equitas Bank Logo Header */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-center">
          <EquitasLogo className="h-10" />
        </div>

        {/* Customer & Loan Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          {data.amount && data.amount > 0 ? (
            <div className="text-center pb-4 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Amount Due
              </span>
              <div className="text-3xl font-extrabold text-[#003874] mt-1">
                {formatINR(data.amount)}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-xs text-slate-500">Customer Name</span>
              <span className="font-semibold text-slate-900">{data.customerName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-xs text-slate-500">Loan Account Number</span>
              <span className="font-mono font-bold text-slate-900">{data.loanAccountNumber}</span>
            </div>

            {/* Loan UPI ID with copy button */}
            <div className="pt-2">
              <span className="text-xs text-slate-500 block mb-1.5">Loan UPI ID</span>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <code className="font-mono text-xs font-bold text-[#003874] select-all truncate">
                  {data.upiId}
                </code>
                <button
                  onClick={handleCopyUpiId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
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

        {/* UPI App Buttons Section */}
        {data.upiLinks && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
              Pay via UPI App
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Google Pay */}
              <a
                href={data.upiLinks.googlePay}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-transform active:scale-95"
              >
                <div className="w-5 h-5 flex items-center justify-center font-bold text-sm text-blue-600">
                  G
                </div>
                <span className="text-xs font-bold text-slate-800">Google Pay</span>
              </a>

              {/* PhonePe */}
              <a
                href={data.upiLinks.phonePe}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-white border border-purple-200 hover:bg-purple-50/50 shadow-sm transition-transform active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                  पे
                </div>
                <span className="text-xs font-bold text-purple-900">PhonePe</span>
              </a>

              {/* Paytm */}
              <a
                href={data.upiLinks.paytm}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-white border border-sky-200 hover:bg-sky-50/50 shadow-sm transition-transform active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[8px]">
                  Pay
                </div>
                <span className="text-xs font-bold text-sky-900">Paytm</span>
              </a>

              {/* Any UPI App */}
              <a
                href={data.upiLinks.universal}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#003874] hover:bg-[#002855] text-white shadow-sm transition-transform active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-bold">Any UPI App</span>
              </a>
            </div>
          </div>
        )}

        {/* QR Code Section */}
        {data.qrCodeDataUrl && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-[#003874]" />
              Scan QR Code to Pay
            </div>

            <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <Image
                src={data.qrCodeDataUrl}
                alt="Equitas UPI QR Code"
                width={200}
                height={200}
                unoptimized
                className="mx-auto"
              />
            </div>

            <p className="text-xs text-slate-500">
              Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        Equitas Small Finance Bank
      </footer>
    </div>
  );
}
