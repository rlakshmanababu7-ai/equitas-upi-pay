import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createStaffSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: max 5 login attempts per 5 minutes per IP
  const rateLimit = await checkRateLimit(`login:${ip}`, { limit: 5, windowSeconds: 300 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Please try again in ${rateLimit.resetInSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const trimmedUsername = String(username).trim().toLowerCase();
    const user = await db.staffUser.findUnique({
      where: { username: trimmedUsername },
    });

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      await logAuditEvent({
        action: "STAFF_LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        metadata: { attemptedUsername: trimmedUsername },
      });

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Create session
    await createStaffSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    await logAuditEvent({
      action: "STAFF_LOGIN_SUCCESS",
      ipAddress: ip,
      userAgent,
      metadata: { userId: user.id, username: user.username },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Internal server error." },
      { status: 500 }
    );
  }
}
