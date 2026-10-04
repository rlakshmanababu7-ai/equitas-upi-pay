"use client";

import { useState } from "react";
import EquitasLogo from "@/components/EquitasLogo";
import { Copy, Check, Send, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";
import { generateEquitasUpiId, formatINR } from "@/lib/upi";

export default function GeneratorPage() {
  const [customerName, setCustomerName] = useState("");
  const [loanAccountNumber, setLoanAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedResult, setGeneratedResult] = useState<{
    paymentUrl: string;
    customerName: string;
    loanAccountNumber: string;
    upiId: string;
    amount: number | null;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Auto-calculated UPI ID preview as user types
  const autoUpiId = loanAccountNumber.trim()
    ? generateEquitasUpiId(loanAccountNumber)
    : "loan.<loanaccountnumber>@equitas";

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Please enter Customer Name.");
      return;
    }

    if (!loanAccountNumber.trim()) {
      setError("Please enter Loan Account Number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          loanAccountNumber: loanAccountNumber.trim(),
          amount: amount.trim() ? parseFloat(amount) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate link.");
      }

      setGeneratedResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error generating payment link.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppUrl = () => {
    if (!generatedResult) return "#";
    const amountText = generatedResult.amount
      ? ` of ${formatINR(generatedResult.amount)}`
      : "";
    const msg = `Dear ${generatedResult.customerName}, please use this link to pay your Equitas loan EMI${amountText} (Loan A/c: ${generatedResult.loanAccountNumber}):\n\n${generatedResult.paymentUrl}\n\nUPI ID: ${generatedResult.upiId}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header with Equitas Logo */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <EquitasLogo className="h-9" />
          <span className="text-xs font-semibold text-[#003874] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Loan Payment Portal
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-xl mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-[#003874] tracking-tight">
            Generate Loan Payment Link
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Enter loan details to generate an instant Equitas UPI payment link
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Field 1: Customer Name (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874] focus:border-[#003874]"
              />
            </div>

            {/* Field 2: Loan Account Number (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Loan Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DHJ474949"
                value={loanAccountNumber}
                onChange={(e) => setLoanAccountNumber(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874] focus:border-[#003874]"
              />

              {/* Automatic UPI ID Preview */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Generated UPI ID:</span>
                <span className="font-mono font-bold text-[#003874]">
                  {autoUpiId}
                </span>
              </div>
            </div>

            {/* Field 3: Amount (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Amount (INR)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 5000 (leave blank if flexible)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874] focus:border-[#003874]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#003874] hover:bg-[#002855] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-60"
            >
              {loading ? "Generating Link..." : "Generate Payment Link"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Generated Result Card */}
          {generatedResult && (
            <div className="mt-8 pt-6 border-t border-slate-200 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Payment Link Generated Successfully!
                </div>
                <div className="text-xs text-slate-600 space-y-1 mt-2">
                  <div>
                    <strong>Customer:</strong> {generatedResult.customerName}
                  </div>
                  <div>
                    <strong>Loan Account:</strong> {generatedResult.loanAccountNumber}
                  </div>
                  <div>
                    <strong>UPI ID:</strong>{" "}
                    <code className="font-mono font-bold text-[#003874]">
                      {generatedResult.upiId}
                    </code>
                  </div>
                  {generatedResult.amount && (
                    <div>
                      <strong>Amount:</strong> {formatINR(generatedResult.amount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Shareable URL input and action buttons */}
              <div className="space-y-2">
                <input
                  type="text"
                  readOnly
                  value={generatedResult.paymentUrl}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-mono text-xs select-all focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#003874] hover:bg-[#002855] text-white text-xs font-semibold transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <a
                    href={getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  <a
                    href={generatedResult.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Page
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        Equitas Small Finance Bank • Loan Payment Service
      </footer>
    </div>
  );
}
