import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { verifyAcademyRegistrationOtp } from "@/modules/academies/academy-service";
import { signSessionToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { challengeId, otp } = body;

    if (!challengeId || !otp) {
      return NextResponse.json(
        { success: false, error: "Challenge ID and 6-digit verification code are required" },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await verifyAcademyRegistrationOtp({
      challengeId,
      otp,
      ipAddress: clientIp,
    });

    // Automatically authenticate the newly created owner
    const token = await signSessionToken({
      userId: result.owner.id,
      email: result.owner.email,
      name: result.owner.name,
      role: "ACADEMY_OWNER",
      academyId: result.academy.id,
    });

    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
