/**
 * Resend Transactional Email Service
 * Handles one-time verification passcodes (OTP) for account activation.
 */

interface ResendSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendOtpEmail(params: {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  role: "COACH" | "PLAYER";
  athlixId: string;
}): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "ATHLIX Security <onboarding@resend.dev>";

  // Development / Test fallback when API key is not present
  if (!apiKey) {
    console.log(
      `\n============================================================\n` +
      `[RESEND OTP EMAIL SIMULATION - DEV MODE]\n` +
      `To: ${params.recipientName} <${params.toEmail}>\n` +
      `Role: ${params.role} | ATHLIX ID: ${params.athlixId}\n` +
      `>>> 6-DIGIT VERIFICATION OTP: [ ${params.otpCode} ] <<<\n` +
      `Valid for: 5 minutes\n` +
      `------------------------------------------------------------\n` +
      `Notice: Provide RESEND_API_KEY in .env.local to send live emails\n` +
      `============================================================\n`
    );
    return { success: true, id: `mock-resend-${Date.now()}` };
  }

  const roleTitle = params.role === "COACH" ? "Coach" : "Player";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; margin: 0; padding: 40px 20px; color: #101820; }
        .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #DCE1E3; overflow: hidden; }
        .header { background: #101820; padding: 24px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: 2px; }
        .header span { color: #C6F432; }
        .content { padding: 32px 28px; }
        .title { font-size: 18px; font-weight: 700; color: #101820; margin-bottom: 8px; }
        .subtitle { font-size: 13px; color: #8B969E; margin-bottom: 24px; }
        .otp-container { background: #F4F3EE; border-radius: 8px; border: 1px solid #DCE1E3; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 8px; }
        .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #101820; }
        .expiry-notice { font-size: 13px; font-weight: 600; color: #EA4335; margin-top: 12px; }
        .warning-box { background: #FFF9E6; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 12px; line-height: 1.5; color: #92400E; margin-top: 24px; }
        .footer { background: #FAF9F5; border-top: 1px solid #DCE1E3; padding: 16px; text-align: center; font-size: 11px; color: #8B969E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATHL<span>I</span>X</h1>
        </div>
        <div class="content">
          <div class="title">Verify Your ${roleTitle} Account</div>
          <div class="subtitle">ATHLIX ID: <strong>${params.athlixId}</strong></div>
          <p style="font-size: 14px; line-height: 1.6; color: #202A32; margin: 0 0 16px 0;">
            Hello ${params.recipientName}, use the verification code below to verify your email address and create your account password.
          </p>

          <div class="otp-container">
            <div class="otp-label">One-Time Verification Passcode</div>
            <div class="otp-digits">${params.otpCode}</div>
            <div class="expiry-notice">⏱ This code expires in exactly 5 minutes</div>
          </div>

          <div class="warning-box">
            <strong>Security Warning:</strong> Never share this OTP with anyone. ATHLIX support will never ask for your verification code. If you did not attempt to register, please disregard this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ATHLIX Platform Security. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.toEmail],
        subject: `${params.otpCode} is your ATHLIX verification code`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Resend API Error]", res.status, errBody);
      return { success: false, error: errBody };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error("[Resend Network Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
