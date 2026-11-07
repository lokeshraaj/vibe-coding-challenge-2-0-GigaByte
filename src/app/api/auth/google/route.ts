import { NextResponse } from "next/server";
import { authenticateWithGoogle } from "@/modules/authentication/google-auth-service";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Firebase ID token is required." },
        { status: 400 }
      );
    }

    const { token, payload } = await authenticateWithGoogle(idToken);

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: payload,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
