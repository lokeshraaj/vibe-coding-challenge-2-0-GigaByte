/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Handles informational notifications for newly provisioned Coaches and Players.
 */

interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

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
    console.log(
      `\n============================================================\n` +
      `[BREVO EMAIL SIMULATION - DEV MODE]\n` +
      `To: ${params.toName} <${params.toEmail}>\n` +
      `From: ${senderName} <${senderEmail}>\n` +
      `Subject: ${params.subject}\n` +
      `------------------------------------------------------------\n` +
      `Notice: To send real emails, provide BREVO_API_KEY in .env.local\n` +
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
      return { success: false, error: errBody };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("[Brevo Network Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends informational email to a newly added Coach containing their Coach ID.
 * Adheres strictly to requirements: NO sign-up link, NO OTP.
 */
export async function sendCoachNotificationEmail(params: {
  toEmail: string;
  coachName: string;
  coachId: string;
  academyName: string;
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
        .id-box { background: #F4F3EE; border: 2px dashed #101820; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
        .id-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 6px; }
        .id-value { font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #101820; }
        .info-card { background: #FAF9F5; border: 1px solid #DCE1E3; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; }
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
            <div class="id-label">Your Official Coach ID</div>
            <div class="id-value">${params.coachId}</div>
          </div>

          <div class="info-card">
            <strong>How to Activate Your Account:</strong><br>
            1. Open the ATHLIX platform in your browser.<br>
            2. Navigate to the <strong>Coach Registration</strong> page.<br>
            3. Enter your assigned Coach ID: <strong>${params.coachId}</strong>.<br>
            4. Verify your email via a secure one-time passcode and configure your password.
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
    subject: `Your ATHLIX Coach ID: ${params.coachId} - ${params.academyName}`,
    htmlContent,
  });
}

/**
 * Sends informational email to a newly registered Player containing their Player ID.
 * Adheres strictly to requirements: NO registration link, NO OTP.
 */
export async function sendPlayerNotificationEmail(params: {
  toEmail: string;
  playerName: string;
  playerId: string;
  academyName: string;
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
        .id-box { background: #F4F3EE; border: 2px dashed #101820; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
        .id-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8B969E; margin-bottom: 6px; }
        .id-value { font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #101820; }
        .info-card { background: #FAF9F5; border: 1px solid #DCE1E3; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; }
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
            <div class="id-label">Your Official Player ID</div>
            <div class="id-value">${params.playerId}</div>
          </div>

          <div class="info-card">
            <strong>How to Register and Activate Your Profile:</strong><br>
            1. Visit the ATHLIX platform.<br>
            2. Choose <strong>Player Registration</strong>.<br>
            3. Enter your Player ID: <strong>${params.playerId}</strong>.<br>
            4. Complete the 6-digit email OTP verification and create your secure password.
          </div>

          <p class="paragraph" style="font-size: 12px; color: #8B969E; margin-bottom: 0;">
            Security notice: Do not share your Player ID. No OTP or registration link is included in this preliminary email.
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
    subject: `Your ATHLIX Player ID: ${params.playerId} - ${params.academyName}`,
    htmlContent,
  });
}
