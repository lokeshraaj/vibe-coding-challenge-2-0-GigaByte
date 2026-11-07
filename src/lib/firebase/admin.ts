import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  // Handle escaped \n characters commonly present in environment variables
  return key.replace(/\\n/g, "\n");
}

let firebaseAdminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    firebaseAdminApp = existingApps[0];
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Fallback for default application credentials or test environments
    firebaseAdminApp = initializeApp({
      projectId: projectId || "athlix-dev",
    });
  }

  return firebaseAdminApp;
}

/**
 * Verifies a Firebase ID token sent from the client.
 * Enforces cryptographic signature, audience, issuer, and expiration checks.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  // checkRevoked = true ensures revoked tokens are rejected
  return auth.verifyIdToken(idToken, true);
}
