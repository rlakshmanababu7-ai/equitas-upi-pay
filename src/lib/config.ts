/**
 * Centralized Server-Side Configuration
 *
 * CRITICAL SECURITY ASSURANCE:
 * This module is STRICTLY intended for server execution. Secrets and Merchant receiving
 * credentials must NEVER be exported to client components.
 */

export interface ServerConfig {
  merchantUpiId: string;
  merchantName: string;
  merchantCode: string;
  appBaseUrl: string;
  sessionSecret: string;
  webhookSecret: string;
  linkExpiryMinutes: number;
}

export function getServerConfig(): ServerConfig {
  const merchantUpiId = process.env.MERCHANT_UPI_ID || "apexfinserve.emi@icici";
  const merchantName = process.env.MERCHANT_NAME || "Apex FinServe Lending Ltd";
  const merchantCode = process.env.MERCHANT_CODE || "6012";
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const sessionSecret =
    process.env.SESSION_SECRET ||
    "development-default-session-secret-at-least-32-chars-long";
  const webhookSecret = process.env.WEBHOOK_SECRET || "default-dev-webhook-secret";

  return {
    merchantUpiId,
    merchantName,
    merchantCode,
    appBaseUrl: appBaseUrl.replace(/\/$/, ""),
    sessionSecret,
    webhookSecret,
    linkExpiryMinutes: 5, // Exactly 5 minutes per user specification
  };
}
