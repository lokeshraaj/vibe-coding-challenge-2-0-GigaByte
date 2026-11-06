import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { forgotPasswordInitiateSchema } from "@/lib/validation/schemas";
import { initiatePasswordReset } from "@/modules/authentication/password-reset-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = forgotPasswordInitiateSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await initiatePasswordReset({
      academyCode: validatedData.academyCode,
      identifier: validatedData.identifier,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        challengeId: result.challengeId,
        maskedEmail: result.maskedEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
