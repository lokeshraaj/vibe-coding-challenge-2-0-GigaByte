import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { loginSchema } from "@/lib/validation/schemas";
import { loginUser } from "@/modules/authentication/auth-service";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const { token, payload } = await loginUser(validatedData);

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
