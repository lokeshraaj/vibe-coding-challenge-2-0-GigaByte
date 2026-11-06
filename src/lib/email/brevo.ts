/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Handles all transactional communications for ATHLIX:
 * - Academy registration welcome with Academy Code
 * - Informational notifications with Academy Code and Coach IDs
 * - Informational notifications with Academy Code and Player IDs
 * - Cryptographically verified 6-digit OTP verification emails for account activation
 */

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Core Brevo API dispatcher for transactional emails.
 * Uses BREVO_API_KEY, BREVO_SENDER_EMAIL, and BREVO_SENDER_NAME.
 */
export async function sendBrevoEmail(params: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@athlix.com";
  const senderName = process.env.BREVO_SENDER_NAME || "ATHLIX";

  // Fallback for development/testing when API key is not yet set in environment
  if (!apiKey) {
    const sanitizedSubject = params.subject.replace(/\b\d{6}\b/, "[REDACTED_OTP]");
    console.log(
      `\n============================================================\n` +
      `[BREVO EMAIL SIMULATION - DEV MODE]\n` +
      `To: ${params.toName} <${params.toEmail}>\n` +
      `From: ${senderName} <${senderEmail}>\n` +
      `Subject: ${sanitizedSubject}\n` +
      `Security: Passcodes and sensitive authentication values are redacted\n` +
      `------------------------------------------------------------\n` +
      `Notice: To dispatch real emails, configure BREVO_API_KEY in .env.local\n` +
      `============================================================\n`
    );
    return { success: true, messageId: `mock-brevo-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: params.toEmail, name: params.toName }],
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Brevo API Error]", res.status, errBody);
      return { success: false, error: `Brevo API HTTP ${res.status}: ${errBody}` };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("[Brevo Network Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error contacting Brevo",
    };
  }
}

/**
 * Sends welcome and registration confirmation email to an Academy Owner containing their official Academy Code.
 */
export async function sendAcademyRegistrationEmail(params: {
  toEmail: string;
  ownerName: string;
  academyName: string;
  academyCode: string;
  city?: string;
  state: string;
}): Promise<BrevoSendResult> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; margin: 0; padding: 40px 20px; color: #101820; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #DCE1E3; overflow: hidden; }
        .header { background: #101820; padding: 28px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px; }
        .header span { color: #C6F432; }
        .content { padding: 36px 32px; }
        .badge { display: inline-block; background: #F4F3EE; color: #101820; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #DCE1E3; margin-bottom: 20px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .paragraph { font-size: 14px; line-height: 1.6; color: #202A32; margin-bottom: 24px; }
        .code-box { background: #F4F3EE; border: 2px dashed #101820; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
        .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 6px; }
        .code-value { font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #101820; }
        .meta-list { background: #FAF9F5; border: 1px solid #DCE1E3; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
        .meta-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #EAEBE6; }
        .meta-item:last-child { border-bottom: none; }
        .footer { background: #FAF9F5; border-top: 1px solid #DCE1E3; padding: 20px; text-align: center; font-size: 12px; color: #8B969E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATHL<span>I</span>X</h1>
        </div>
        <div class="content">
          <div class="badge">Academy Tenant Registered</div>
          <div class="greeting">Congratulations, ${params.ownerName}!</div>
          <p class="paragraph">
            Your academy, <strong>${params.academyName}</strong>, has been successfully registered on the ATHLIX Multi-Tenant Platform.
          </p>

          <div class="code-box">
            <div class="code-label">Permanent Official Academy Code</div>
            <div class="code-value">${params.academyCode}</div>
          </div>

          <div class="meta-list">
            <div class="meta-item"><span><strong>Academy Name:</strong></span> <span>${params.academyName}</span></div>
            <div class="meta-item"><span><strong>Academy Code:</strong></span> <span>${params.academyCode}</span></div>
            <div class="meta-item"><span><strong>Location:</strong></span> <span>${params.city ? `${params.city}, ` : ""}${params.state}</span></div>
          </div>

          <div class="paragraph" style="font-size: 13px; line-height: 1.6;">
            <strong>Important Onboarding Instructions:</strong><br>
            • Share your Academy Code (<strong>${params.academyCode}</strong>) with your coaches and players.<br>
            • Coaches and players require this Academy Code alongside their individual ID to sign in and activate their accounts.<br>
            • As Academy Owner, you can sign in directly to your owner dashboard using your email address and password.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ATHLIX Multi-Tenant Sports Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.ownerName,
    subject: `Welcome to ATHLIX - Your Academy Code: ${params.academyCode} (${params.academyName})`,
    htmlContent,
  });
}

/**
 * Sends informational email to a newly added Coach containing their Academy Code and Coach ID.
 * Adheres strictly to requirements: NO sign-up link, NO OTP.
 */
export async function sendCoachNotificationEmail(params: {
  toEmail: string;
  coachName: string;
  coachId: string;
  academyName: string;
  academyCode: string;
  sport: string;
}): Promise<BrevoSendResult> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; margin: 0; padding: 40px 20px; color: #101820; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #DCE1E3; overflow: hidden; }
        .header { background: #101820; padding: 28px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px; }
        .header span { color: #C6F432; }
        .content { padding: 36px 32px; }
        .badge { display: inline-block; background: #F4F3EE; color: #101820; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #DCE1E3; margin-bottom: 20px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .paragraph { font-size: 14px; line-height: 1.6; color: #202A32; margin-bottom: 24px; }
        .id-box { background: #F4F3EE; border: 2px dashed #101820; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .id-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 6px; }
        .id-value { font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #101820; }
        .info-card { background: #FAF9F5; border: 1px solid #DCE1E3; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
        .footer { background: #FAF9F5; border-top: 1px solid #DCE1E3; padding: 20px; text-align: center; font-size: 12px; color: #8B969E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATHL<span>I</span>X</h1>
        </div>
        <div class="content">
          <div class="badge">Coaching Staff Appointment</div>
          <div class="greeting">Welcome, Coach ${params.coachName}!</div>
          <p class="paragraph">
            You have been officially appointed as a <strong>${params.sport}</strong> Coach for <strong>${params.academyName}</strong> on ATHLIX.
          </p>

          <div class="id-box">
            <div class="id-label">Academy Name</div>
            <div style="font-size: 16px; font-weight: 700; color: #101820; margin-bottom: 12px;">${params.academyName}</div>
            <div class="id-label">Academy Code</div>
            <div class="id-value" style="margin-bottom: 16px; color: #101820;">${params.academyCode}</div>
            <div class="id-label">Your Official Coach ID</div>
            <div class="id-value">${params.coachId}</div>
          </div>

          <div class="info-card">
            <strong>How to Activate Your Account:</strong><br>
            1. Open the ATHLIX platform in your browser.<br>
            2. Navigate to the <strong>Coach Registration</strong> page.<br>
            3. Enter your Academy Code: <strong>${params.academyCode}</strong>.<br>
            4. Enter your assigned Coach ID: <strong>${params.coachId}</strong>.<br>
            5. Verify your email via the secure 6-digit OTP and configure your password.
          </div>

          <p class="paragraph" style="font-size: 12px; color: #8B969E; margin-bottom: 0;">
            Note: For security reasons, no direct sign-up link or OTP is included in this notice. Please visit ATHLIX directly to begin activation.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ATHLIX Multi-Tenant Sports Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.coachName,
    subject: `Your ATHLIX Coach ID: ${params.coachId} [Academy: ${params.academyCode}] - ${params.academyName}`,
    htmlContent,
  });
}

/**
 * Sends informational email to a newly registered Player containing their Academy Code and Player ID.
 * Adheres strictly to requirements: NO registration link, NO OTP.
 */
export async function sendPlayerNotificationEmail(params: {
  toEmail: string;
  playerName: string;
  playerId: string;
  academyName: string;
  academyCode: string;
  sport: string;
}): Promise<BrevoSendResult> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; margin: 0; padding: 40px 20px; color: #101820; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #DCE1E3; overflow: hidden; }
        .header { background: #101820; padding: 28px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px; }
        .header span { color: #C6F432; }
        .content { padding: 36px 32px; }
        .badge { display: inline-block; background: #F4F3EE; color: #101820; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #DCE1E3; margin-bottom: 20px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .paragraph { font-size: 14px; line-height: 1.6; color: #202A32; margin-bottom: 24px; }
        .id-box { background: #F4F3EE; border: 2px dashed #101820; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .id-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 6px; }
        .id-value { font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #101820; }
        .info-card { background: #FAF9F5; border: 1px solid #DCE1E3; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
        .footer { background: #FAF9F5; border-top: 1px solid #DCE1E3; padding: 20px; text-align: center; font-size: 12px; color: #8B969E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATHL<span>I</span>X</h1>
        </div>
        <div class="content">
          <div class="badge">Athlete Enrollment Notice</div>
          <div class="greeting">Welcome, ${params.playerName}!</div>
          <p class="paragraph">
            You have been enrolled as a <strong>${params.sport}</strong> athlete for <strong>${params.academyName}</strong> on the ATHLIX platform.
          </p>

          <div class="id-box">
            <div class="id-label">Academy Name</div>
            <div style="font-size: 16px; font-weight: 700; color: #101820; margin-bottom: 12px;">${params.academyName}</div>
            <div class="id-label">Academy Code</div>
            <div class="id-value" style="margin-bottom: 16px; color: #101820;">${params.academyCode}</div>
            <div class="id-label">Your Official Player ID</div>
            <div class="id-value">${params.playerId}</div>
          </div>

          <div class="info-card">
            <strong>How to Register and Activate Your Profile:</strong><br>
            1. Visit the ATHLIX platform.<br>
            2. Choose <strong>Player Registration</strong>.<br>
            3. Enter your Academy Code: <strong>${params.academyCode}</strong>.<br>
            4. Enter your Player ID: <strong>${params.playerId}</strong>.<br>
            5. Complete the 6-digit email OTP verification and create your secure password.
          </div>

          <p class="paragraph" style="font-size: 12px; color: #8B969E; margin-bottom: 0;">
            Security notice: Do not share your Player ID or Academy Code. No OTP or registration link is included in this preliminary email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ATHLIX Multi-Tenant Sports Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.playerName,
    subject: `Your ATHLIX Player ID: ${params.playerId} [Academy: ${params.academyCode}] - ${params.academyName}`,
    htmlContent,
  });
}

/**
 * Sends a 6-digit OTP verification email through Brevo for ATHLIX ID onboarding.
 * - Branded with official ATHLIX styling
 * - Clearly states 5-minute expiration
 * - Displays security warnings against sharing
 */
export async function sendOtpEmail(params: {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  role: "COACH" | "PLAYER";
  athlixId: string;
  academyCode?: string;
}): Promise<BrevoSendResult> {
  const roleTitle = params.role === "COACH" ? "Coach" : "Player";
  const academyCodeText = params.academyCode ? ` [Academy: ${params.academyCode}]` : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; margin: 0; padding: 40px 20px; color: #101820; }
        .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #DCE1E3; overflow: hidden; }
        .header { background: #101820; padding: 26px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px; }
        .header span { color: #C6F432; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background: #F4F3EE; color: #101820; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #DCE1E3; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: 700; color: #101820; margin-bottom: 6px; }
        .subtitle { font-size: 13px; color: #8B969E; margin-bottom: 20px; }
        .otp-container { background: #F4F3EE; border-radius: 8px; border: 1px solid #DCE1E3; padding: 22px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 8px; }
        .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #101820; }
        .expiry-notice { font-size: 13px; font-weight: 600; color: #EA4335; margin-top: 12px; }
        .warning-box { background: #FFF9E6; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 12px; line-height: 1.5; color: #92400E; margin-top: 24px; }
        .footer { background: #FAF9F5; border-top: 1px solid #DCE1E3; padding: 18px; text-align: center; font-size: 11px; color: #8B969E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATHL<span>I</span>X</h1>
        </div>
        <div class="content">
          <div class="badge">Security Verification</div>
          <div class="title">Verify Your ${roleTitle} Account</div>
          <div class="subtitle">ATHLIX ID: <strong>${params.athlixId}</strong>${academyCodeText}</div>
          <p style="font-size: 14px; line-height: 1.6; color: #202A32; margin: 0 0 16px 0;">
            Hello ${params.recipientName}, use the verification code below to verify your email address and configure your password.
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

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.recipientName,
    subject: `${params.otpCode} is your ATHLIX verification code`,
    htmlContent,
  });
}
