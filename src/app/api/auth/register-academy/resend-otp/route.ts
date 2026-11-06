import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { resendAcademyRegistrationOtp } from "@/modules/academies/academy-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: "Challenge ID is required to resend verification code" },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await resendAcademyRegistrationOtp({
      challengeId,
      ipAddress: clientIp,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
