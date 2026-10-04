import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const body = await req.json();
    const { linkId, utrNumber, notes } = body;

    if (!linkId || !utrNumber) {
      return NextResponse.json(
        { error: "Payment Link ID and Bank UTR/RRN number are required." },
        { status: 400 }
      );
    }

    const trimmedUtr = String(utrNumber).trim();
    if (trimmedUtr.length < 6) {
      return NextResponse.json(
        { error: "A valid Bank UTR / Reference number is required (min 6 characters)." },
        { status: 400 }
      );
    }

    const link = await db.paymentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }

    const updated = await db.paymentLink.update({
      where: { id: linkId },
      data: {
        status: "CONFIRMED",
        isVerified: true,
        verifiedAt: new Date(),
        paymentProviderRef: trimmedUtr,
        verificationMethod: `MANUAL_STAFF_RECONCILIATION (${session.username})`,
        verificationNotes: notes ? String(notes).trim().slice(0, 200) : "Verified via bank credit ledger",
      },
    });

    await logAuditEvent({
      action: "STATUS_CHECK_INITIATED",
      paymentLinkId: linkId,
      ipAddress: ip,
      userAgent,
      metadata: {
        reconciledBy: session.username,
        utrNumber: trimmedUtr,
        loanReference: link.loanReference,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment manually reconciled and confirmed.",
      link: {
        id: updated.id,
        status: updated.status,
        paymentProviderRef: updated.paymentProviderRef,
        verifiedAt: updated.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Manual reconciliation error:", error);
    return NextResponse.json(
      { error: "Failed to reconcile payment." },
      { status: 500 }
    );
  }
}
