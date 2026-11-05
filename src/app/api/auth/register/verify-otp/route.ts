import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { verifyOtpSchema } from "@/lib/validation/schemas";
import { verifyRegistrationOtp } from "@/modules/authentication/registration-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = verifyOtpSchema.parse(body);

    const result = await verifyRegistrationOtp({
      athlixId: validatedData.athlixId,
      otp: validatedData.otp,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
