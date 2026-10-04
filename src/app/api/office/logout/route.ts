import { NextRequest, NextResponse } from "next/server";
import { clearStaffSession, getStaffSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  if (session) {
    await logAuditEvent({
      action: "STAFF_LOGOUT",
      ipAddress: ip,
      userAgent,
      metadata: { userId: session.userId, username: session.username },
    });
  }

  await clearStaffSession();
  return NextResponse.json({ success: true });
}
