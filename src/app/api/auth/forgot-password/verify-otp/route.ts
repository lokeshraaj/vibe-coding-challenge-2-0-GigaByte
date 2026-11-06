import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { forgotPasswordVerifySchema } from "@/lib/validation/schemas";
import { verifyPasswordResetOtp } from "@/modules/authentication/password-reset-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = forgotPasswordVerifySchema.parse(body);

    const result = await verifyPasswordResetOtp({
      challengeId: validatedData.challengeId,
      otp: validatedData.otp,
    });

    return NextResponse.json(
      {
        success: true,
        resetToken: result.resetToken,
      },
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
