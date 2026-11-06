import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { academyRegisterSchema } from "@/lib/validation/schemas";
import {
  initiateAcademyRegistration,
  registerAcademy,
} from "@/modules/academies/academy-service";
import { signSessionToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Check if direct registration is explicitly requested (e.g. for internal test scripts)
    if (body.direct === true) {
      const validatedData = academyRegisterSchema.parse(body);
      const result = await registerAcademy(validatedData);

      const token = await signSessionToken({
        userId: result.owner.id,
        email: result.owner.email,
        name: result.owner.name,
        role: "ACADEMY_OWNER",
        academyId: result.academy.id,
      });

      await setAuthCookie(token);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // Default Phase 4 workflow: Mandatory Email OTP Verification
    const validatedData = academyRegisterSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const challenge = await initiateAcademyRegistration(validatedData, clientIp);

    return NextResponse.json(
      {
        success: true,
        pendingVerification: true,
        message: `A 6-digit verification code has been sent to ${challenge.maskedEmail}`,
        challengeId: challenge.challengeId,
        maskedEmail: challenge.maskedEmail,
        expiresAt: challenge.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
