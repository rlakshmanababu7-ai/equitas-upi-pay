export function getServerConfig() {
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return {
    appBaseUrl: appBaseUrl.replace(/\/$/, ""),
    linkExpiryHours: 24, // 1 day validity
    webhookSecret: process.env.WEBHOOK_SECRET || "WEBHOOK_SECRET",
    sessionSecret: process.env.SESSION_SECRET || "SESSION_SECRET",
  };
}
