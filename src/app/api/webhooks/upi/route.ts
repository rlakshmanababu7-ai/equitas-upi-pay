import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getServerConfig } from "@/lib/config";
import { logAuditEvent } from "@/lib/audit";

/**
 * Payment Provider Webhook Handler
 *
 * Supported Integrations:
 * - Razorpay UPI webhook (header: `x-razorpay-signature`)
 * - Cashfree UPI webhook (header: `x-webhook-signature`)
 * - Generic/Setu UPI webhook (header: `x-signature` or `x-api-signature`)
 *
 * Security:
 * Requires cryptographic HMAC-SHA256 signature verification using the server's `WEBHOOK_SECRET`.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;
  const config = getServerConfig();

  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-razorpay-signature") ||
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("x-api-signature");

    // 1. Signature Verification
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature header." },
        { status: 401 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", config.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      console.warn("Invalid webhook signature attempt from IP:", ip);
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 403 }
      );
    }

    const payload = JSON.parse(rawBody);

    // Extract reference information from standard provider schemas
    // e.g. payload.event === "payment.captured" or payload.type === "PAYMENT_SUCCESS_WEBHOOK"
    const reference =
      payload.loanReference ||
      payload.payload?.payment?.entity?.notes?.loanReference ||
      payload.data?.order?.order_id ||
      payload.transactionRef;

    const utr =
      payload.utr ||
      payload.payload?.payment?.entity?.acquirer_data?.rrn ||
      payload.data?.payment?.bank_reference ||
      payload.paymentId ||
      "UTR-" + Date.now();

    const providerName = req.headers.get("x-razorpay-signature")
      ? "RAZORPAY_WEBHOOK"
      : req.headers.get("x-webhook-signature")
      ? "CASHFREE_WEBHOOK"
      : "GENERIC_UPI_WEBHOOK";

    if (!reference) {
      return NextResponse.json(
        { error: "Missing loanReference or transactionRef in payload." },
        { status: 400 }
      );
    }

    // 2. Find matching payment link by loanReference
    const link = await db.paymentLink.findFirst({
      where: {
        loanReference: reference,
        status: { in: ["ACTIVE", "EXPIRED"] }, // Can settle even if 5 min page expired
      },
      orderBy: { createdAt: "desc" },
    });

    if (!link) {
      return NextResponse.json(
        { error: "No matching payment link found for reference." },
        { status: 404 }
      );
    }

    // 3. Mark as CONFIRMED and verified
    const updated = await db.paymentLink.update({
      where: { id: link.id },
      data: {
        status: "CONFIRMED",
        isVerified: true,
        verifiedAt: new Date(),
        paymentProviderRef: String(utr),
        verificationMethod: providerName,
        verificationNotes: `Verified via ${providerName} with UTR ${utr}`,
      },
    });

    await logAuditEvent({
      action: "WEBHOOK_RECEIVED",
      paymentLinkId: link.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        provider: providerName,
        loanReference: reference,
        utr,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully reconciled.",
      linkId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing error." },
      { status: 500 }
    );
  }
}
