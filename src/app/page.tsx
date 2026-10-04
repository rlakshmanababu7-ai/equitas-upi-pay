"use client";

import { useState } from "react";
import EquitasLogo from "@/components/EquitasLogo";
import { Copy, Check, Send, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";
import { generateEquitasUpiId, formatINR } from "@/lib/upi";
import { encodePaymentPayload } from "@/lib/payload";

export default function GeneratorPage() {
  const [customerName, setCustomerName] = useState("");
  const [loanAccountNumber, setLoanAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
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

  const handleGenerate = (e: React.FormEvent) => {
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

    const trimmedCustomer = customerName.trim();
    const trimmedLoan = loanAccountNumber.trim().toUpperCase();
    const parsedAmount = amount.trim() ? parseFloat(amount) : null;
    const upiId = generateEquitasUpiId(trimmedLoan);

    // Generate stateless token directly on frontend - NO DB required
    const token = encodePaymentPayload({
      customerName: trimmedCustomer,
      loanAccountNumber: trimmedLoan,
      amount: parsedAmount,
      createdAt: Date.now(),
    });

    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "";
    const paymentUrl = `${origin}/pay/${token}`;

    setGeneratedResult({
      paymentUrl,
      customerName: trimmedCustomer,
      loanAccountNumber: trimmedLoan,
      upiId,
      amount: parsedAmount,
    });
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
      {/* Header with Official Equitas Logo */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <EquitasLogo className="h-8 sm:h-9" />
          <span className="text-[11px] font-semibold text-[#003874] bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
            Loan Payment
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-lg mx-auto px-4 py-6 w-full flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <h1 className="text-xl font-bold text-[#003874] tracking-tight">
            Generate Loan Payment Link
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">
            Enter loan details to generate an instant Equitas UPI payment link
          </p>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Field 1: Customer Name (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874]"
              />
            </div>

            {/* Field 2: Loan Account Number (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loan Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DHJ474949"
                value={loanAccountNumber}
                onChange={(e) => setLoanAccountNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874]"
              />

              {/* Automatic UPI ID Preview */}
              <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Generated UPI ID:</span>
                <span className="font-mono font-bold text-[#003874]">
                  {autoUpiId}
                </span>
              </div>
            </div>

            {/* Field 3: Amount (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Amount (INR)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <div className="relative rounded-lg">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 5000 (optional)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003874]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#003874] hover:bg-[#002855] text-white font-bold text-sm shadow-sm transition-colors"
            >
              Generate Payment Link
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Generated Result Card */}
          {generatedResult && (
            <div className="mt-6 pt-5 border-t border-slate-200 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-3">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Payment Link Generated!
                </div>
                <div className="text-xs text-slate-600 space-y-0.5 mt-1.5">
                  <div>
                    <strong>Customer:</strong> {generatedResult.customerName}
                  </div>
                  <div>
                    <strong>Loan A/c:</strong> {generatedResult.loanAccountNumber}
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-mono text-xs select-all focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-[#003874] hover:bg-[#002855] text-white text-xs font-semibold transition-colors"
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
                    className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  <a
                    href={generatedResult.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
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
      <footer className="py-3 text-center text-xs text-slate-400">
        Equitas Small Finance Bank
      </footer>
    </div>
  );
}
