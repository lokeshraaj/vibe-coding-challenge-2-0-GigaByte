/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 *
 * Implements strict compliance with ATHLIX multi-tenant onboarding rules:
 * 1. Preliminary notification emails NEVER include plain passwords, OTPs, or direct sign-up bypass links.
 * 2. Official Academy Code (SSNNNN) is featured prominently alongside individual IDs.
 * 3. All emails maintain the ATHLIX athletic theme (#101820, #F4F3EE, #C6F432).
 * 4. 6-digit OTP verification emails strictly enforce a 5-minute expiry notice.
 */

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SendEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
}

/**
 * Low-level HTTP fetch caller for Brevo Transactional API (v3).
 */
export async function sendBrevoEmail(params: SendEmailParams): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "aalex04820834@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "ATHLIX";

  if (!apiKey) {
    console.warn(
      `[Brevo Service Simulated] API key not configured. Mocking email delivery to: ${params.toEmail} | Subject: ${params.subject}`
    );
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: params.toEmail,
          name: params.toName,
        },
      ],
      subject: params.subject,
      htmlContent: params.htmlContent,
      replyTo: params.replyTo || {
        email: senderEmail,
        name: senderName,
      },
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Brevo API Error] ${response.status} ${errorBody}`);
      return {
        success: false,
        error: `Brevo API HTTP ${response.status}: ${errorBody}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Brevo Network Error]`, error);
    return {
      success: false,
      error: errMessage,
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
            • Share your Academy Code (<strong>${params.academyCode}</strong>) with your coaches, players and scouts.<br>
            • Members require this Academy Code alongside their individual ID to sign in and activate their accounts.<br>
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
 * Sends a 6-digit OTP verification email to Academy Owner to verify email during registration.
 */
export async function sendAcademyOtpEmail(params: {
  toEmail: string;
  ownerName: string;
  academyName: string;
  otpCode: string;
}): Promise<BrevoSendResult> {
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
          <div class="badge">Email Verification</div>
          <div class="title">Verify Your Academy Registration</div>
          <div class="subtitle">Academy: <strong>${params.academyName}</strong></div>
          <p style="font-size: 14px; line-height: 1.6; color: #202A32; margin: 0 0 16px 0;">
            Hello ${params.ownerName}, please enter the verification passcode below to complete your registration for <strong>${params.academyName}</strong> and receive your official Academy Code.
          </p>

          <div class="otp-container">
            <div class="otp-label">6-Digit Verification Code</div>
            <div class="otp-digits">${params.otpCode}</div>
            <div class="expiry-notice">⏱ This code expires in exactly 5 minutes</div>
          </div>

          <div class="warning-box">
            <strong>Security Notice:</strong> Do not share this OTP with anyone. Your academy tenant will only be provisioned after this verification is completed.
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
    toName: params.ownerName,
    subject: `${params.otpCode} is your ATHLIX academy verification code`,
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
          <div class="badge">Staff Assignment Notice</div>
          <div class="greeting">Welcome to the Team, Coach ${params.coachName}!</div>
          <p class="paragraph">
            You have been assigned as a <strong>${params.sport} Coach</strong> for <strong>${params.academyName}</strong> on the ATHLIX platform.
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
            <strong>How to Activate Your Coaching Account:</strong><br>
            1. Navigate to the ATHLIX portal.<br>
            2. Click <strong>Register</strong> and select <strong>Coach Registration</strong>.<br>
            3. Enter your Academy Code: <strong>${params.academyCode}</strong>.<br>
            4. Enter your Coach ID: <strong>${params.coachId}</strong>.<br>
            5. Complete 6-digit email OTP verification to set your password and access your dashboard.
          </div>

          <p class="paragraph" style="font-size: 12px; color: #8B969E; margin-bottom: 0;">
            Security notice: Do not share your Coach ID or Academy Code. For security, no direct activation link or temporary password is included in this notification.
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
 * Sends informational email to a newly added Scout containing their Academy Code and Scout ID.
 * Adheres strictly to requirements: NO sign-up link, NO OTP.
 */
export async function sendScoutNotificationEmail(params: {
  toEmail: string;
  scoutName: string;
  scoutId: string;
  academyName: string;
  academyCode: string;
  sport: string;
  assignedCoachName?: string;
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
          <div class="badge">Scouting Assignment Notice</div>
          <div class="greeting">Welcome, ${params.scoutName}!</div>
          <p class="paragraph">
            You have been assigned as a dedicated talent scout for <strong>${params.academyName}</strong>${
              params.assignedCoachName ? ` working with Coach ${params.assignedCoachName}` : ""
            } (${params.sport}).
          </p>

          <div class="id-box">
            <div class="id-label">Academy Name</div>
            <div style="font-size: 16px; font-weight: 700; color: #101820; margin-bottom: 12px;">${params.academyName}</div>
            <div class="id-label">Academy Code</div>
            <div class="id-value" style="margin-bottom: 16px; color: #101820;">${params.academyCode}</div>
            <div class="id-label">Your Official Scout ID</div>
            <div class="id-value">${params.scoutId}</div>
          </div>

          <div class="info-card">
            <strong>How to Activate Your Scouting Profile:</strong><br>
            1. Visit the ATHLIX platform.<br>
            2. Click <strong>Register</strong> and select <strong>Scout Registration</strong>.<br>
            3. Enter your Academy Code: <strong>${params.academyCode}</strong>.<br>
            4. Enter your Scout ID: <strong>${params.scoutId}</strong>.<br>
            5. Complete email OTP verification and establish your account credentials.
          </div>

          <p class="paragraph" style="font-size: 12px; color: #8B969E; margin-bottom: 0;">
            Security notice: Do not share your Scout ID or Academy Code. No direct activation link is provided in this notification.
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
    toName: params.scoutName,
    subject: `Your ATHLIX Scout ID: ${params.scoutId} [Academy: ${params.academyCode}] - ${params.academyName}`,
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
            2. Click <strong>Register</strong> and select <strong>Player Registration</strong>.<br>
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
 */
export async function sendOtpEmail(params: {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  role: "COACH" | "PLAYER" | "SCOUT";
  athlixId: string;
  academyCode?: string;
}): Promise<BrevoSendResult> {
  const roleTitle = params.role === "COACH" ? "Coach" : params.role === "SCOUT" ? "Scout" : "Player";
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

/**
 * Sends a 6-digit OTP verification email for Forgot Password recovery.
 */
export async function sendPasswordResetOtpEmail(params: {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  identifier: string;
  academyCode?: string;
}): Promise<BrevoSendResult> {
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
          <div class="badge">Password Reset</div>
          <div class="title">Reset Your ATHLIX Password</div>
          <div class="subtitle">Account ID: <strong>${params.identifier}</strong>${academyCodeText}</div>
          <p style="font-size: 14px; line-height: 1.6; color: #202A32; margin: 0 0 16px 0;">
            Hello ${params.recipientName}, we received a request to reset your password. Use the verification passcode below to authorize this password change.
          </p>

          <div class="otp-container">
            <div class="otp-label">Password Reset Code</div>
            <div class="otp-digits">${params.otpCode}</div>
            <div class="expiry-notice">⏱ This code expires in exactly 5 minutes</div>
          </div>

          <div class="warning-box">
            <strong>Security Notice:</strong> Never share this code. If you did not request a password reset, you can safely ignore this email; your account remains secure.
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
    subject: `${params.otpCode} is your ATHLIX password reset code`,
    htmlContent,
  });
}
