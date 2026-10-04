import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: max 30 status checks per minute per IP
  const rateLimit = await checkRateLimit(`status_check:${ip}`, {
    limit: 30,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many status checks. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  try {
    const tokenHash = hashToken(token);
    const link = await db.paymentLink.findUnique({
      where: { tokenHash },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Payment link not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = now.getTime() > link.expiresAt.getTime();

    await logAuditEvent({
      action: "STATUS_CHECK_INITIATED",
      paymentLinkId: link.id,
      ipAddress: ip,
      userAgent,
      metadata: { currentStatus: link.status, isVerified: link.isVerified },
    });

    // If verified by provider webhook or manual bank statement reconciliation
    if (link.isVerified && link.status === "CONFIRMED") {
      return NextResponse.json({
        confirmed: true,
        status: "CONFIRMED",
        verifiedAt: link.verifiedAt?.toISOString(),
        paymentProviderRef: link.paymentProviderRef,
        message: "Payment successfully verified and credited to your loan account.",
      });
    }

    // If expired and not verified
    if (isExpired) {
      if (link.status === "ACTIVE") {
        await db.paymentLink.update({
          where: { id: link.id },
          data: { status: "EXPIRED" },
        });
      }
      return NextResponse.json({
        confirmed: false,
        status: "EXPIRED",
        message:
          "This payment link has expired. If money was debited from your account, it will be automatically reconciled via your bank statement or refunded within 24-48 hours.",
      });
    }

    // IMPORTANT: Payment is NOT yet verified by payment gateway / bank reconciliation.
    // We strictly DO NOT mark payment as confirmed just because the user clicked the button!
    return NextResponse.json({
      confirmed: false,
      status: "PENDING_VERIFICATION",
      message:
        "Payment is awaiting confirmation from our banking partner. UPI transfers settle directly between bank accounts. Please allow 5-15 minutes for automated reconciliation. Do not make duplicate payments.",
      supportContact: {
        phone: "+91 8000-123-456",
        email: "support@apexfinserve.com",
      },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status. Internal server error." },
      { status: 500 }
    );
  }
}
