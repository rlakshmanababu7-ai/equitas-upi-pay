import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getServerConfig } from "./config";

export interface StaffSession {
  userId: string;
  username: string;
  name: string;
  role: string;
}

const COOKIE_NAME = "staff_auth_token";

function getSecretKey() {
  const config = getServerConfig();
  return new TextEncoder().encode(config.sessionSecret);
}

/**
 * Creates an encrypted JWT session cookie for an authenticated staff user.
 */
export async function createStaffSession(user: StaffSession): Promise<string> {
  const secretKey = getSecretKey();
  const token = await new SignJWT({
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h") // Staff shifts
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours
  });

  return token;
}

/**
 * Retrieves and validates the current staff session from cookies.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Clears the staff authentication cookie upon logout.
 */
export async function clearStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
