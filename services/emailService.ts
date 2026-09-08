import dns from "dns";
import nodemailer from "nodemailer";

// ============================================================
// FORCE IPV4 FIRST
// ============================================================

dns.setDefaultResultOrder("ipv4first");

// ============================================================
// GMAIL CONFIGURATION
// ============================================================

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

// ============================================================
// STG COLLEGE CLOUDINARY BRAND IMAGE
// ============================================================

const COLLEGE_IMAGE =
  "https://res.cloudinary.com/dlkborjdl/image/upload/f_auto,q_auto,w_1200/v1787452197/IMG_20260823_075544_rbgexi.jpg";

const COLLEGE_LOGO =
  "https://res.cloudinary.com/dlkborjdl/image/upload/f_auto,q_auto,w_250/v1787452197/IMG_20260823_075544_rbgexi.jpg";

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

if (!gmailUser) {
  console.error("❌ GMAIL_USER is not configured.");
}

if (!gmailAppPassword) {
  console.error("❌ GMAIL_APP_PASSWORD is not configured.");
}

// ============================================================
// GMAIL TRANSPORTER (FIXED WITH 'as any' FOR TYPESCRIPT)
// ============================================================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",

  // Gmail SSL submission (Port 465 works best on cloud hosting like Render)
  port: 465,

  // SSL/TLS
  secure: true,

  auth: {
    user: gmailUser,
    pass: gmailAppPassword,
  },

  // Timeouts
  connectionTimeout: 30000,
  greetingTimeout: 20000,
  socketTimeout: 45000,

  tls: {
    rejectUnauthorized: false,
  },
} as any);

// ============================================================
// SMTP CONNECTION CHECK
// ============================================================

transporter
  .verify()
  .then(() => {
    console.log("✅ Gmail SMTP connection ready");
    console.log(
      "📡 SMTP: smtp.gmail.com:465 SSL"
    );
    console.log("🌐 DNS: IPv4 first");
  })
  .catch((error: any) => {
    console.error(
      "❌ Gmail SMTP connection failed"
    );

    console.error(
      "MESSAGE:",
      error?.message || "Unknown SMTP error"
    );

    console.error(
      "CODE:",
      error?.code || "UNKNOWN"
    );

    console.error(
      "RESPONSE:",
      error?.response || "NO RESPONSE"
    );

    console.error(
      "COMMAND:",
      error?.command || "NO COMMAND"
    );

    console.error(
      "ADDRESS:",
      error?.address || "NO ADDRESS"
    );

    console.error(
      "PORT:",
      error?.port || "NO PORT"
    );
  });

// ============================================================
// SEND OTP EMAIL
// ============================================================

export const sendOtpEmail = async (
  to: string,
  otp: string
) => {
  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (!gmailUser) {
    throw new Error(
      "GMAIL_USER is missing on the server."
    );
  }

  if (!gmailAppPassword) {
    throw new Error(
      "GMAIL_APP_PASSWORD is missing on the server."
    );
  }

  if (!to) {
    throw new Error(
      "Recipient email is required."
    );
  }

  if (!otp) {
    throw new Error(
      "OTP is required."
    );
  }

  const cleanEmail =
    to.trim().toLowerCase();

  const cleanOtp =
    String(otp).trim();

  const startTime =
    Date.now();

  console.log(
    "=========================================="
  );

  console.log(
    `📧 Sending OTP to ${cleanEmail}...`
  );

  console.log(
    "=========================================="
  );

  // ==========================================================
  // PREMIUM STG COLLEGE OTP EMAIL
  // ==========================================================

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>STG College | Email Verification</title>
</head>
<body style="margin:0; padding:0; background:#edf1f7; font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background: linear-gradient(rgba(6,10,20,0.93), rgba(10,15,28,0.96)), url('${COLLEGE_IMAGE}'); background-size:cover; background-position:center; background-repeat:no-repeat;">
  <tr>
    <td align="center" style="padding:55px 15px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:650px; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.38);">
        <tr>
          <td align="center" style="padding:0; background: linear-gradient(rgba(8,13,26,0.72), rgba(8,13,26,0.94)), url('${COLLEGE_IMAGE}'); background-size:cover; background-position:center; background-repeat:no-repeat;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:48px 25px 44px;">
                  <img src="${COLLEGE_LOGO}" alt="STG College" width="105" height="105" style="display:block; width:105px; height:105px; object-fit:cover; border-radius:50%; border: 4px solid rgba(255,255,255,0.96); box-shadow: 0 12px 40px rgba(0,0,0,0.42);">
                  <div style="margin-top:22px; color:#ffffff; font-size:31px; line-height:1.1; font-weight:900; letter-spacing:3px;">
                    STG COLLEGE
                  </div>
                  <div style="margin-top:10px; color:#fbbf24; font-size:12px; font-weight:900; letter-spacing:4px; text-transform:uppercase;">
                    STG EXAM MASTER
                  </div>
                  <div style="width:78px; height:3px; margin:20px auto 0; background:#f59e0b; border-radius:50px;"></div>
                  <div style="margin-top:17px; color:#cbd5e1; font-size:11px; letter-spacing:1.5px; text-transform:uppercase;">
                    Secure Student Communication
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:46px 42px 42px; background:#ffffff;">
            <div style="text-align:center;">
              <div style="display:inline-block; width:72px; height:72px; line-height:72px; border-radius:50%; background: linear-gradient(145deg, #fff7ed, #fffbeb); border: 1px solid #fed7aa; box-shadow: 0 10px 30px rgba(245,158,11,0.15); font-size:31px;">
                🔐
              </div>
            </div>

            <h1 style="margin:22px 0 0; text-align:center; color:#111827; font-size:29px; line-height:1.25; font-weight:900; letter-spacing:-0.6px;">
              Verify Your Email
            </h1>

            <p style="margin:13px auto 0; max-width:500px; text-align:center; color:#64748b; font-size:15px; line-height:1.8;">
              Welcome to <strong style="color:#111827;">STG Exam Master</strong>. Your account verification code is ready. Enter the code below to continue securely.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;">
              <tr>
                <td align="center" style="padding:2px; border-radius:27px; background: linear-gradient(135deg, #f59e0b, #fbbf24, #f97316, #fbbf24, #f59e0b); box-shadow: 0 14px 40px rgba(245,158,11,0.25);">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:25px; background: linear-gradient(145deg, #fffdf8, #fff7ed);">
                    <tr>
                      <td align="center" style="padding:35px 20px 34px;">
                        <div style="display:inline-block; padding:8px 16px; border-radius:50px; background:#fff1d6; border: 1px solid #fed7aa; color:#92400e; font-size:10px; font-weight:900; letter-spacing:2.5px; text-transform:uppercase;">
                          ✦ VERIFICATION CODE ✦
                        </div>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                          <tr>
                            <td align="center" style="padding:3px; border-radius:22px; background: linear-gradient(135deg, #fde68a, #f59e0b, #fb923c); box-shadow: 0 10px 30px rgba(245,158,11,0.18);">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td align="center" style="min-width:220px; padding: 22px 24px; border-radius:19px; background:#ffffff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);">
                                    <div style="color:#111827; font-family:Arial,Helvetica,sans-serif; font-size:43px; line-height:1.15; font-weight:900; letter-spacing:11px; white-space:nowrap; text-shadow: 0 3px 12px rgba(15,23,42,0.10);">
                                      ${cleanOtp}
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <div style="margin-top:19px; color:#92400e; font-size:13px; font-weight:600; line-height:1.7;">
                          Your secure verification code
                        </div>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin:13px auto 0;">
                          <tr>
                            <td align="center" style="padding:8px 15px; border-radius:50px; background:#fff7ed; border: 1px solid #fed7aa; color:#b45309; font-size:11px; font-weight:800; letter-spacing:0.5px;">
                              ⏱ Valid for 5 minutes
                            </td>
                          </tr>
                        </table>

                        <div style="margin-top:20px; color:#a16207; font-size:10px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">
                          Enter this code in STG Exam Master
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:27px;">
              <tr>
                <td style="padding:21px 22px; border-radius:18px; background:#f8fafc; border: 1px solid #e2e8f0;">
                  <div style="color:#111827; font-size:14px; font-weight:900; margin-bottom:7px;">
                    🛡️ Security Notice
                  </div>
                  <div style="color:#64748b; font-size:13px; line-height:1.8;">
                    Never share this verification code with anyone. STG College will never ask you to disclose your OTP or password.
                  </div>
                </td>
              </tr>
            </table>

            <div style="margin-top:27px; text-align:center; color:#94a3b8; font-size:12px; line-height:1.8;">
              You are receiving this email because an email verification was requested for your STG College account.
            </div>

            <div style="margin-top:8px; text-align:center; color:#cbd5e1; font-size:11px;">
              If you did not request this, you may safely ignore this email.
            </div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:34px 25px; background: linear-gradient(145deg, #0f172a, #111827);">
            <div style="color:#ffffff; font-size:16px; font-weight:900; letter-spacing:1.5px;">
              STG COLLEGE
            </div>
            <div style="margin-top:8px; color:#fbbf24; font-size:10px; font-weight:900; letter-spacing:3px;">
              EDUCATION • EXAM • EXCELLENCE
            </div>
            <div style="width:55px; height:2px; margin:17px auto; background:#f59e0b; border-radius:10px;"></div>
            <div style="color:#94a3b8; font-size:11px; line-height:1.7;">
              Secure • Trusted • Student Focused
            </div>
            <div style="margin-top:11px; color:#64748b; font-size:10px;">
              © ${new Date().getFullYear()} STG College. All rights reserved.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

  // ==========================================================
  // SEND EMAIL
  // ==========================================================

  try {
    const smtpStart = Date.now();
    console.log("📤 SMTP sendMail START");

    const info = await transporter.sendMail({
      from: `"STG College" <${gmailUser}>`,
      to: cleanEmail,
      subject: "STG College | Your Verification Code",
      html,
      text:
        `STG COLLEGE\n\n` +
        `EMAIL VERIFICATION\n\n` +
        `Your verification code is: ${cleanOtp}\n\n` +
        `This code is valid for 5 minutes.\n\n` +
        `Never share this code with anyone.\n\n` +
        `STG College | Education • Exam • Excellence`,
    });

    const smtpTime = Date.now() - smtpStart;
    const totalTime = Date.now() - startTime;

    console.log(`📥 Gmail SMTP accepted email in ${smtpTime} ms`);
    console.log(`✅ OTP email sent successfully in ${totalTime} ms`);
    console.log("📨 Message ID:", info.messageId);
    console.log("==========================================");

    return info;

  } catch (error: any) {
    const elapsed = Date.now() - startTime;

    console.error("==========================================");
    console.error(`❌ OTP email failed after ${elapsed} ms`);
    console.error("ERROR MESSAGE:", error?.message || "Unknown error");
    console.error("ERROR CODE:", error?.code || "UNKNOWN");
    console.error("SMTP RESPONSE:", error?.response || "NO RESPONSE");
    console.error("COMMAND:", error?.command || "NO COMMAND");
    console.error("ADDRESS:", error?.address || "NO ADDRESS");
    console.error("PORT:", error?.port || "NO PORT");
    console.error("==========================================");

    throw error;
  }
};