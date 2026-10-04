"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  PlusCircle,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertTriangle,
  Send,
  Building2,
  RefreshCw,
  Info,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";
import { formatINR, maskUpiId } from "@/lib/upi";

interface StaffSession {
  userId: string;
  username: string;
  name: string;
  role: string;
}

interface GeneratedLinkData {
  paymentUrl: string;
  token: string;
  linkId: string;
  expiresAt: string;
  details: {
    customerName?: string | null;
    amount: number;
    loanReference: string;
    description?: string | null;
  };
}

interface PaymentLinkItem {
  id: string;
  tokenPrefix: string;
  customerName: string | null;
  customerUpiId: string;
  amount: number;
  loanReference: string;
  description: string | null;
  status: string;
  isVerified: boolean;
  paymentProviderRef: string | null;
  verifiedAt: string | null;
  expiresAt: string;
  createdAt: string;
  createdByName: string;
  remainingSeconds: number;
}

export default function StaffDashboard({ session }: { session: StaffSession }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerUpiId, setCustomerUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [loanReference, setLoanReference] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Link generated result
  const [generatedLink, setGeneratedLink] = useState<GeneratedLinkData | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Recent links list
  const [links, setLinks] = useState<PaymentLinkItem[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Manual reconciliation modal
  const [reconcileTarget, setReconcileTarget] = useState<PaymentLinkItem | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Fetch recent links
  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/office/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (e) {
      console.error("Failed to load links:", e);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // Auto-refresh links table every 15 seconds to reflect expiry & status changes
    const interval = setInterval(fetchLinks, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/office/logout", { method: "POST" });
    startTransition(() => {
      router.push("/office/login");
      router.refresh();
    });
  };

  // Handle Form Submission
  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid positive EMI amount in INR.");
      return;
    }

    if (parsedAmount > 200000) {
      setFormError("Amount cannot exceed the standard UPI transaction limit of ₹2,00,000.");
      return;
    }

    if (!loanReference.trim()) {
      setFormError("Loan/Account Reference is required.");
      return;
    }

    if (!customerUpiId.trim() || !customerUpiId.includes("@")) {
      setFormError("A valid customer UPI ID (e.g. name@bank) is required for internal records.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/office/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          customerUpiId: customerUpiId.trim().toLowerCase(),
          amount: parsedAmount,
          loanReference: loanReference.trim().toUpperCase(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate link.");
      }

      setGeneratedLink(data);
      // Reset form fields
      setCustomerName("");
      setCustomerUpiId("");
      setAmount("");
      setLoanReference("");
      setDescription("");

      // Refresh list
      fetchLinks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Copy to clipboard
  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.paymentUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  // Build WhatsApp Message
  const getWhatsAppShareUrl = () => {
    if (!generatedLink) return "#";
    const nameStr = generatedLink.details.customerName
      ? `Dear ${generatedLink.details.customerName}, `
      : "Dear Customer, ";
    const msg = `${nameStr}here is your secure UPI payment link for EMI of ${formatINR(
      generatedLink.details.amount
    )} (Loan Ref: ${
      generatedLink.details.loanReference
    }).\n\nPay here: ${generatedLink.paymentUrl}\n\n*Note: This secure link is valid for exactly 5 minutes.* Apex FinServe Ltd.`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  // Handle Manual Bank Reconciliation
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setReconcileError("Valid Bank UTR / Reference number is required (min 6 characters).");
      return;
    }

    setReconciling(true);
    setReconcileError(null);

    try {
      const res = await fetch("/api/office/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: reconcileTarget.id,
          utrNumber: utrNumber.trim(),
          notes: reconcileNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reconcile.");
      }

      setReconcileTarget(null);
      setUtrNumber("");
      setReconcileNotes("");
      fetchLinks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setReconcileError(err.message);
      } else {
        setReconcileError("An error occurred during reconciliation.");
      }
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-navy-950 text-white border-b border-navy-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-800 border border-navy-700 text-white flex items-center justify-center font-bold text-sm">
              AF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight">Apex FinServe</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-navy-800 text-navy-200 border border-navy-700">
                  Staff Office Desk
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{session.name}</span>
              <span className="text-[11px] text-slate-400 font-mono">{session.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Important UPI Rule Banner */}
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 flex items-start gap-3 text-sm text-navy-900">
          <Info className="w-5 h-5 text-navy-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold">Business Receiving Account Policy: </span>
            All customer payments will be collected directly into the business receiving account{" "}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-navy-200 font-semibold text-navy-800">
              apexfinserve.emi@icici
            </code>
            . The Customer UPI ID requested below is retained solely as an internal reference
            identifier and will never be used as the payment recipient.
          </div>
        </div>

        {/* Live Generated Link Alert Modal / Card */}
        {generatedLink && (
          <GeneratedLinkCard
            data={generatedLink}
            onClose={() => setGeneratedLink(null)}
            onCopy={handleCopyLink}
            isCopied={linkCopied}
            whatsAppUrl={getWhatsAppShareUrl()}
          />
        )}

        {/* Two-Column Grid: Link Generator Form & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generator Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PlusCircle className="w-5 h-5 text-navy-900" />
              <h2 className="text-lg font-bold text-slate-900">
                Generate Short-Lived EMI Payment Link
              </h2>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <span className="font-semibold block">Validation Error</span>
                  <span>{formError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerateLink} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Loan Reference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Loan / Account Reference <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LN-2025-98432"
                    value={loanReference}
                    onChange={(e) => setLoanReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-navy-800 focus:border-navy-800 uppercase placeholder:normal-case placeholder:text-slate-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Unique customer loan contract identifier
                  </span>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    EMI Amount (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="200000"
                      required
                      placeholder="e.g. 12500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-navy-800 focus:border-navy-800 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {amount && !isNaN(parseFloat(amount))
                      ? `Formatted: ${formatINR(parseFloat(amount))}`
                      : "Max ₹2,00,000 per standard UPI limit"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Customer UPI ID (Internal Reference) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer UPI ID <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Internal Ref Only
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. customer@okaxis"
                    value={customerUpiId}
                    onChange={(e) => setCustomerUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-navy-800 focus:border-navy-800 placeholder:text-slate-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Used for staff records. NOT the receiving account.
                  </span>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-navy-800 focus:border-navy-800 placeholder:text-slate-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Greeting shown on customer landing summary
                  </span>
                </div>
              </div>

              {/* Payment Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Personal Loan Monthly EMI - October 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-navy-800 focus:border-navy-800 placeholder:text-slate-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed on the customer payment card and bank narration
                </span>
              </div>

              {/* Expiry Rule Note */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-navy-700 shrink-0" />
                  <span>
                    Link will expire exactly <strong>5 minutes</strong> after generation. Server rejects expired tokens.
                  </span>
                </div>
                <span className="font-mono font-semibold text-navy-800 shrink-0">300s TTL</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-navy-900 text-white font-semibold text-sm hover:bg-navy-800 focus:ring-2 focus:ring-offset-2 focus:ring-navy-900 transition-colors shadow-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Secure Token...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Generate Payment Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Metrics & Guidelines */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-navy-800" />
                Office Guidelines
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>5-Minute Lifetime:</strong> Customers must complete the payment within 5 minutes. Do not generate links prematurely.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Direct Bank Routing:</strong> All funds credit directly to the company bank account linked to merchant VPA.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>No Data in URL:</strong> Tokens are 256-bit unguessable hashes. Never email personal identifiers.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Verification Integrity:</strong> If customer pays via UPI app, confirm bank credit via Webhook or manual Bank UTR reconciliation below.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-navy-900 to-navy-950 text-white rounded-2xl p-6 border border-navy-800 shadow-md">
              <div className="flex items-center gap-2 text-paygreen-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                Security Guarantee
              </div>
              <h4 className="text-base font-bold text-white mb-2">Zero Plaintext Storage</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Raw tokens are never stored in the database. Only their SHA-256 cryptographic hash is kept. Once a link is generated, share it immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Generated Links Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Payment Links</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit records of short-lived links generated across staff desk
              </p>
            </div>
            <button
              onClick={fetchLinks}
              disabled={loadingLinks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLinks ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Loan Ref</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Customer UPI (Ref)</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {links.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      {loadingLinks ? "Loading payment links..." : "No payment links generated yet."}
                    </td>
                  </tr>
                ) : (
                  links.map((item) => {
                    const isExpired = item.status === "EXPIRED" || item.remainingSeconds <= 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-navy-900">
                          {item.loanReference}
                        </td>
                        <td className="px-6 py-4 text-slate-900">
                          {item.customerName || (
                            <span className="text-slate-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {maskUpiId(item.customerUpiId)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {formatINR(item.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {item.isVerified || item.status === "CONFIRMED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmed
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              Active ({Math.floor(item.remainingSeconds / 60)}m {item.remainingSeconds % 60}s)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {item.isVerified ? (
                            <span className="text-[11px] text-emerald-700 font-mono" title={`Provider Ref: ${item.paymentProviderRef}`}>
                              Ref: {item.paymentProviderRef?.slice(0, 10)}...
                            </span>
                          ) : (
                            <button
                              onClick={() => setReconcileTarget(item)}
                              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-navy-800 text-[11px] font-medium transition-colors"
                            >
                              Verify UTR
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manual Staff Reconciliation Modal */}
      {reconcileTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Verify Bank Settlement (UTR)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reconcile payment for Loan Ref: <strong>{reconcileTarget.loanReference}</strong> ({formatINR(reconcileTarget.amount)})
            </p>

            {reconcileError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {reconcileError}
              </div>
            )}

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bank UTR / RRN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 427819842104"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-navy-800"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  12-digit UPI reference number from the bank credit advice
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Staff Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified on ICICI corporate banking ledger"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReconcileTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconciling}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {reconciling ? "Verifying..." : "Confirm Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * High-Visibility Generated Link Component with Live 5-minute countdown and Share Actions
 */
function GeneratedLinkCard({
  data,
  onClose,
  onCopy,
  isCopied,
  whatsAppUrl,
}: {
  data: GeneratedLinkData;
  onClose: () => void;
  onCopy: () => void;
  isCopied: boolean;
  whatsAppUrl: string;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  useEffect(() => {
    const expiryTime = new Date(data.expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data.expiresAt]);

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="font-bold text-sm">
            Payment Link Generated Successfully!
          </span>
        </div>
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-xs font-mono font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Expires in: {formattedTime}</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Link summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Loan Reference</span>
            <span className="font-mono font-bold text-slate-900">{data.details.loanReference}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Amount</span>
            <span className="font-bold text-emerald-700">{formatINR(data.details.amount)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Customer</span>
            <span className="font-semibold text-slate-900">
              {data.details.customerName || "Customer"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Expiry Exact Time</span>
            <span className="font-mono text-slate-700">
              {new Date(data.expiresAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Shareable URL input and Copy button */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Shareable Customer URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={data.paymentUrl}
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-mono text-xs sm:text-sm select-all focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                disabled={isExpired}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors ${
                  isExpired ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <Send className="w-4 h-4" />
                WhatsApp Share
              </a>
              <a
                href={data.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs transition-colors"
                title="Preview Customer Payment Page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Warning if expired */}
        {isExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>
              <strong>Link Expired:</strong> The 5-minute security lifetime has elapsed. Payments through this URL are now rejected by the server.
            </span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs text-slate-500">
          <span className="italic">
            Raw token is never saved plaintext in the database.
          </span>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
