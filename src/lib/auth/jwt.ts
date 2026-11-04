import { SignJWT, jwtVerify } from "jose";
import { AuthSessionPayload } from "@/types";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "athlix_super_secure_production_ready_jwt_secret_key_2026_xyz987654321";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export const AUTH_COOKIE_NAME = "athlix_session";
export const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function signSessionToken(payload: AuthSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as AuthSessionPayload;
  } catch (err) {
    return null;
  }
}
