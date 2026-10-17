import crypto from "crypto";
import { AuthUser } from "shared";

const JWT_SECRET = process.env.JWT_SECRET || "lepark-jwt-secret-key-multiplayer-2026";
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Hash a password using scrypt with random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain password against a stored salt:hash string.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT token.
 */
export function generateToken(user: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      username: user.username,
      displayName: user.displayName || null,
      role: user.role || "user",
      exp,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Verify an HMAC-SHA256 JWT token and return the payload if valid.
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedSigBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));

    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!decoded.id || !decoded.username) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
      displayName: decoded.displayName || null,
      role: decoded.role === "superadmin" ? "superadmin" : "user",
    };
  } catch {
    return null;
  }
}
