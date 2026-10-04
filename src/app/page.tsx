import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  ArrowRight,
  QrCode,
  Lock,
  Building2,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center font-bold tracking-wider shadow-sm">
              AF
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-lg leading-tight block">
                Apex FinServe
              </span>
              <span className="text-xs text-slate-500 font-medium">
                EMI UPI Payment Engine
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/office"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-900"
            >
              Office Staff Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 border border-navy-200 text-navy-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-navy-600" />
            Enterprise Fintech Link Engine
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Short-Lived EMI Payment Links with Instant UPI Intent & QR
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Generate cryptographically secure 5-minute EMI payment links for loan
            customers. Direct bank settlement through UPI with zero sensitive URL parameters
            and verified server-side reconciliation.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/office"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-navy-900 text-white text-base font-medium hover:bg-navy-800 transition-all shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-navy-900"
            >
              Access Office Desk
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-base font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              View UPI Architecture
            </a>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div id="architecture" className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Strict 5-Minute Server Expiry
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Links are strictly validated on the server. Expired links are rejected
              server-side, stopping payment initiation and hiding payment credentials.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-paygreen-50 text-paygreen-700 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Business Merchant Payee Routing
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Customer UPI IDs are stored solely for office reference. All UPI intents
              (GPay, PhonePe, Paytm) and QR codes route to our configured merchant receiving account.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Verified Reconciliation Flow
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Payments are never falsely reported as successful. Confirmation requires
              cryptographic webhook notifications or staff bank statement verification.
            </p>
          </div>
        </div>

        {/* Security & Architecture Specs Box */}
        <div className="mt-12 bg-navy-950 text-slate-100 rounded-2xl p-6 sm:p-8 border border-navy-800 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-navy-800/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-paygreen-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Lock className="w-3.5 h-3.5" />
                Security Standards & Best Practices
              </div>
              <h2 className="text-xl font-bold text-white">
                Cryptographic Token Protection
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-navy-800/80 text-slate-300 text-xs font-mono">
                SHA-256 Token Hash
              </span>
              <span className="px-3 py-1 rounded-md bg-navy-800/80 text-slate-300 text-xs font-mono">
                256-bit Entropy
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="font-semibold text-white block mb-1">No Plaintext Tokens</span>
              <span className="text-slate-400 text-xs">
                Tokens are hashed with SHA-256 before saving to the database. Raw tokens exist only in the generated URL.
              </span>
            </div>
            <div>
              <span className="font-semibold text-white block mb-1">Protected Office Desk</span>
              <span className="text-slate-400 text-xs">
                Staff portal requires secure HttpOnly cookie session authentication with server-side validation.
              </span>
            </div>
            <div>
              <span className="font-semibold text-white block mb-1">Zero PII in URL</span>
              <span className="text-slate-400 text-xs">
                URLs contain only the unguessable token slug. Customer name, amount, and loan numbers are never in the URL.
              </span>
            </div>
            <div>
              <span className="font-semibold text-white block mb-1">Rate Limiting & Audit</span>
              <span className="text-slate-400 text-xs">
                Every link creation, view attempt, and status inquiry is throttled and recorded in the audit trail.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Apex FinServe Lending Ltd • Licensed Non-Banking Financial Company (NBFC)
          </div>
          <div>NPCI Unified Payments Interface (UPI) Standards Compliant</div>
        </div>
      </footer>
    </div>
  );
}
