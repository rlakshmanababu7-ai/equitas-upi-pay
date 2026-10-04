"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Smartphone,
  QrCode,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Mail,
  HelpCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { formatINR } from "@/lib/upi";

interface PayeeDetails {
  payeeVpa: string;
  payeeName: string;
}

interface UpiLinks {
  universal: string;
  googlePay: string;
  phonePe: string;
  paytm: string;
  bhim: string;
}

interface PaymentData {
  expired: boolean;
  amount: number;
  loanReference: string;
  customerName?: string | null;
  description?: string | null;
  expiresAt: string;
  remainingSeconds: number;
  status: string;
  isVerified: boolean;
  payeeDetails: PayeeDetails;
  upiLinks: UpiLinks;
  qrCodeDataUrl: string;
  message?: string;
}

interface StatusCheckResponse {
  confirmed: boolean;
  status: string;
  message: string;
  verifiedAt?: string;
  paymentProviderRef?: string;
  supportContact?: {
    phone: string;
    email: string;
  };
}

export default function CustomerPaymentView({ token }: { token: string }) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Expiry timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isExpiredLocally, setIsExpiredLocally] = useState<boolean>(false);

  // Copy state
  const [vpaCopied, setVpaCopied] = useState(false);

  // Status check state
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusCheckResponse | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Initial fetch of link details
  const fetchPaymentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pay/${encodeURIComponent(token)}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to load payment link.");
      }

      setData(result);
      if (result.expired) {
        setIsExpiredLocally(true);
        setSecondsRemaining(0);
      } else {
        const remaining = result.remainingSeconds ?? 300;
        setSecondsRemaining(remaining);
        setIsExpiredLocally(remaining <= 0);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFetchError(err.message);
      } else {
        setFetchError("Unable to retrieve payment link details.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);

  // Real-time countdown timer synchronized with server expiresAt
  useEffect(() => {
    if (!data || data.expired || isExpiredLocally) return;

    const expiryTimestamp = new Date(data.expiresAt).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        setIsExpiredLocally(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data, isExpiredLocally]);

  // Copy Merchant VPA
  const handleCopyVpa = () => {
    if (!data?.payeeDetails?.payeeVpa) return;
    navigator.clipboard.writeText(data.payeeDetails.payeeVpa);
    setVpaCopied(true);
    setTimeout(() => setVpaCopied(false), 3000);
  };

  // Status check action ("I have completed payment")
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setShowStatusModal(true);
    setStatusResult(null);

    try {
      const res = await fetch(`/api/pay/${encodeURIComponent(token)}/check-status`, {
        method: "POST",
      });
      const result = await res.json();
      setStatusResult(result);

      if (result.confirmed) {
        // Refresh payment data
        fetchPaymentDetails();
      }
    } catch (err) {
      console.error("Status check failed:", err);
      setStatusResult({
        confirmed: false,
        status: "ERROR",
        message: "Network error while checking status. Please try again shortly.",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Loading Payment Details</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verifying encrypted token and fetching UPI configuration...
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-navy-700 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (fetchError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-lg text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payment Link Unavailable</h2>
            <p className="text-sm text-slate-600 mt-2">
              {fetchError || "This payment link could not be found or has been revoked."}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 border border-slate-200 text-left">
            <span className="font-semibold text-slate-700 block mb-1">What should I do?</span>
            Please contact the loan office or support executive who shared this link with you to receive an updated payment link.
          </div>
        </div>
      </div>
    );
  }

  const isExpired = data.expired || isExpiredLocally;
  const isConfirmed = data.isVerified || data.status === "CONFIRMED";

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // 3. Payment Confirmed Screen
  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden text-center">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8">
            <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center mx-auto shadow-md mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold">Payment Confirmed</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Your EMI payment has been verified and settled
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-slate-900 text-base">
                  {formatINR(data.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Loan Reference</span>
                <span className="font-mono font-semibold text-slate-900">
                  {data.loanReference}
                </span>
              </div>
              {data.customerName && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Customer Name</span>
                  <span className="font-semibold text-slate-900">{data.customerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Receiving Merchant</span>
                <span className="font-semibold text-slate-900">
                  {data.payeeDetails?.payeeName || "Apex FinServe Lending Ltd"}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed">
              Official transaction receipt and loan statement update will be sent to your registered mobile number and email.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Expired State Screen
  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Expired Top Bar */}
          <div className="bg-slate-900 text-white p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
              <Clock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Payment Link Expired
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              5-minute security limit has elapsed
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Context Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Loan Reference:</span>
                <span className="font-mono font-bold text-slate-900">{data.loanReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-bold text-slate-900">{formatINR(data.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expired At:</span>
                <span className="font-mono text-slate-600">
                  {new Date(data.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Explanation */}
            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-xl p-4">
              <span className="font-semibold text-amber-900 block mb-1">
                Why did this link expire?
              </span>
              For your financial security, EMI payment links remain valid for exactly{" "}
              <strong>5 minutes</strong>. This prevents duplicate debit attempts or
              outdated payment requests. <strong>Payment initiation from this link is now disabled.</strong>
            </div>

            {/* Office Contact Action */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Contact Office for a New Link
              </span>
              <a
                href="tel:+918000123456"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                Call Loan Desk (+91 8000-123-456)
              </a>
              <a
                href="mailto:support@apexfinserve.com?subject=Request%20New%20Payment%20Link"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email Support Team
              </a>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              If your bank account was already debited, your transaction reference will be reconciled via automated banking batch.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Active Payment Experience
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Verified Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy-900 text-white flex items-center justify-center font-bold text-sm">
              AF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm leading-none">
                  {data.payeeDetails.payeeName}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Verified Business Payee • NPCI UPI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
            <Lock className="w-3 h-3 text-slate-600" />
            <span>256-bit SSL</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-4 py-6 w-full space-y-6 flex-1">
        {/* Urgent Live Expiry Banner */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            secondsRemaining < 60
              ? "bg-red-50 border-red-300 text-red-900"
              : secondsRemaining < 120
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-navy-50 border-navy-200 text-navy-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock
                className={`w-5 h-5 ${
                  secondsRemaining < 60
                    ? "text-red-600 animate-pulse"
                    : secondsRemaining < 120
                    ? "text-amber-600"
                    : "text-navy-700"
                }`}
              />
              <div>
                <span className="text-xs font-semibold block uppercase tracking-wider">
                  Link Expiration Window
                </span>
                <span className="text-xs opacity-80">
                  Must complete UPI approval before timer reaches zero
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-extrabold tracking-tight">
                {timerDisplay}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                secondsRemaining < 60
                  ? "bg-red-600"
                  : secondsRemaining < 120
                  ? "bg-amber-500"
                  : "bg-navy-800"
              }`}
              style={{ width: `${(secondsRemaining / 300) * 100}%` }}
            />
          </div>
        </div>

        {/* EMI Payment Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                EMI Amount Due
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {formatINR(data.amount)}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              Active Request
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">Loan Reference</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {data.loanReference}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Customer Name</span>
              <span className="font-semibold text-slate-800">
                {data.customerName || "Loan Customer"}
              </span>
            </div>
            {data.description && (
              <div className="col-span-2 pt-1">
                <span className="text-slate-400 block">Description</span>
                <span className="text-slate-700">{data.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payee Verification Safety Notice */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Security Verification:</strong> When your UPI app launches, verify that the payee name matches{" "}
            <strong>{data.payeeDetails.payeeName}</strong> and the amount matches{" "}
            <strong>{formatINR(data.amount)}</strong> before entering your UPI PIN.
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-navy-800" />
            Choose UPI Payment Option
          </h2>

          {/* Quick Pay App Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Pay */}
            <a
              href={data.upiLinks.googlePay}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-blue-600">
                G
              </span>
              <span>Google Pay</span>
            </a>

            {/* PhonePe */}
            <a
              href={data.upiLinks.phonePe}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/50 text-purple-900 font-semibold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                पे
              </span>
              <span>PhonePe</span>
            </a>

            {/* Paytm */}
            <a
              href={data.upiLinks.paytm}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/50 text-sky-900 font-semibold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[10px]">
                Pay
              </span>
              <span>Paytm</span>
            </a>

            {/* Any UPI App */}
            <a
              href={data.upiLinks.universal}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Any UPI App</span>
            </a>
          </div>

          {/* QR Code Section (Great for scanning from mobile screen or desktop) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-navy-800" />
              Or Scan UPI QR Code
            </div>

            <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-inner">
              {data.qrCodeDataUrl ? (
                <Image
                  src={data.qrCodeDataUrl}
                  alt="UPI Payment QR Code"
                  width={220}
                  height={220}
                  unoptimized
                  className="mx-auto rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Scan with any UPI app on your phone (Google Pay, PhonePe, Paytm, BHIM, Cred, or Mobile Banking)
            </p>

            {/* Copyable Business VPA Fallback */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 block mb-1.5 uppercase font-semibold">
                Business Payee UPI Address
              </span>
              <div className="flex items-center justify-center gap-2">
                <code className="font-mono text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 select-all border border-slate-200">
                  {data.payeeDetails.payeeVpa}
                </code>
                <button
                  onClick={handleCopyVpa}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  {vpaCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy VPA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action: I Have Completed Payment */}
        <div className="pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={checkingStatus}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-paygreen-600 hover:bg-paygreen-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-70"
          >
            {checkingStatus ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking Banking Confirmation...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                I Have Completed Payment
              </>
            )}
          </button>
          <span className="text-[11px] text-slate-400 text-center block mt-2">
            Status is verified via automated bank settlement. Clicking does not mark payment successful without bank confirmation.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1">
        <div>
          Apex FinServe Lending Ltd • RBI Regulated Non-Banking Financial Company
        </div>
        <div className="text-[11px] text-slate-400">
          Encrypted 256-bit Session • No Card or Account Details are Stored
        </div>
      </footer>

      {/* Status Modal Triggered by "I Have Completed Payment" */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            {checkingStatus ? (
              <div className="py-6 space-y-3">
                <div className="w-12 h-12 rounded-full border-4 border-navy-100 border-t-navy-800 animate-spin mx-auto" />
                <h3 className="font-bold text-slate-900">Querying Banking Gateway</h3>
                <p className="text-xs text-slate-500">
                  Checking if bank settlement credit has arrived for Loan Ref {data.loanReference}...
                </p>
              </div>
            ) : statusResult?.confirmed ? (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Payment Confirmed!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your payment has been successfully verified and credited.
                </p>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full py-2.5 rounded-lg bg-navy-900 text-white text-xs font-semibold"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Awaiting Bank Confirmation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {statusResult?.message ||
                    "UPI transfers settle directly between bank accounts. We are awaiting automated bank confirmation. If your account was debited, your loan account will be credited shortly."}
                </p>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left">
                  <span className="font-semibold block mb-0.5">Important Safety Advice:</span>
                  Please do not make a second payment. If your bank debited the amount, keep your 12-digit UPI UTR number for reference.
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    I Understand
                  </button>
                  <button
                    onClick={handleCheckStatus}
                    className="flex-1 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold"
                  >
                    Check Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
