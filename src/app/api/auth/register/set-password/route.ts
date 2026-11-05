import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { setPasswordSchema } from "@/lib/validation/schemas";
import { completeAccountActivation } from "@/modules/authentication/registration-service";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = setPasswordSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await completeAccountActivation({
      activationToken: validatedData.activationToken,
      password: validatedData.password,
      ipAddress: clientIp,
    });

    // Automatically set HTTP-only authentication cookie for seamless login
    await setAuthCookie(result.sessionToken);

    return NextResponse.json(
      {
        success: true,
        user: result.user,
        redirectUrl: result.redirectUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
