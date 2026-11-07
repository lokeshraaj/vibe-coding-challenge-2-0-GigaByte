import type { App } from "firebase-admin/app";
import type { DecodedIdToken } from "firebase-admin/auth";
import { createRemoteJWKSet, jwtVerify } from "jose";

function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let formatted = key.trim();
  // Strip outer quotes if the private key was pasted into Vercel wrapped in quotes
  if (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1).trim();
  }
  // Handle escaped \n characters commonly present in environment variables
  return formatted.replace(/\\n/g, "\n");
}

let firebaseAdminApp: App | null = null;

export async function getFirebaseAdminApp(): Promise<App | null> {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    try {
      const { getApps, initializeApp, cert } = await import("firebase-admin/app");
      const existingApps = getApps();
      if (existingApps.length > 0 && existingApps[0]) {
        firebaseAdminApp = existingApps[0];
        return firebaseAdminApp;
      }
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return firebaseAdminApp;
    } catch (e) {
      console.warn("[Firebase Admin Init Warning] Failed to initialize with cert:", e);
    }
  }

  return null;
}

// Google's official public JSON Web Key Set for Firebase ID Tokens
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

/**
 * Verifies a Firebase ID token sent from the client.
 * Enforces cryptographic signature, audience, issuer, and expiration checks.
 *
 * Strategies:
 * 1. Firebase Admin SDK if service account credentials are provided.
 * 2. Google Public JWKS standard cryptographic verification via WebCrypto / jose
 *    (ensures rock-solid zero-downtime verification on Vercel serverless environments).
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }

  // Strategy 1: Attempt Firebase Admin SDK if service account credentials are provided
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const app = await getFirebaseAdminApp();
      if (app) {
        const { getAuth } = await import("firebase-admin/auth");
        const auth = getAuth(app);
        return await auth.verifyIdToken(idToken);
      }
    } catch (adminError: any) {
      // Re-throw genuine token revocation or expiration
      if (
        adminError?.code === "auth/id-token-expired" ||
        adminError?.code === "auth/id-token-revoked"
      ) {
        throw adminError;
      }
      console.warn("[Firebase Admin Verification] Falling back to Google JWKS:", adminError?.message);
    }
  }

  // Strategy 2: Official Google JWKS Signature Verification via jose
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  return {
    ...payload,
    uid: payload.sub as string,
    email: payload.email as string | undefined,
    email_verified: Boolean(payload.email_verified),
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    iss: payload.iss as string,
    aud: payload.aud as string,
    auth_time: (payload.auth_time as number) || (payload.iat as number),
    user_id: payload.sub as string,
    sub: payload.sub as string,
    iat: payload.iat as number,
    exp: payload.exp as number,
    firebase: (payload.firebase as any) || {
      identities: {},
      sign_in_provider: "google.com",
    },
  } as unknown as DecodedIdToken;
}
