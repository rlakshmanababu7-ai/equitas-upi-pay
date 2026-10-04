import crypto from "crypto";

/**
 * Generate a cryptographically secure, unguessable token for payment links.
 * 32 bytes of randomness = 256 bits entropy, encoded in URL-safe base64.
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash a payment token using SHA-256 before saving to the database.
 * The raw token is only given to the client and never stored in plaintext.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Safe prefix for audit logging and staff review without leaking the token.
 */
export function getTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

/**
 * Hash a staff user's password using scrypt with a unique salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain password against a stored scrypt hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
